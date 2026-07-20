# Plan de Testings — Integración FBNeo + GGPO

## 1. Pruebas Unitarias (Automatizables)

### 1.1 `buildQuarkArgs()`

| ID | Escenario | Input | Expected Output | Script |
|----|-----------|-------|-----------------|--------|
| UT-01 | Args básicos host | `kof98, 6003, "192.168.1.10", 6004, 0` | `["quark:direct,kof98,6003,192.168.1.10,6004,0,0", "-w"]` | `test_ggpo_unit.js` |
| UT-02 | Args básicos guest | `kof98, 6004, "192.168.1.10", 6003, 1` | `["quark:direct,kof98,6004,192.168.1.10,6003,1,0", "-w"]` | `test_ggpo_unit.js` |
| UT-03 | Rom con espacios | `kof98, 6003, "::1", 6004, 0` | `["quark:direct,kof98,6003,::1,6004,0,0", "-w"]` | `test_ggpo_unit.js` |
| UT-04 | Spectator mode | `kof98, 6003, "10.0.0.1", 6004, 2` | `["quark:direct,kof98,6003,10.0.0.1,6004,2,1", "-w"]` | `test_ggpo_unit.js` |
| UT-05 | IPv6 loopback | `kof98, 6003, "::1", 6004, 0` | `["quark:direct,kof98,6003,::1,6004,0,0", "-w"]` | `test_ggpo_unit.js` |
| UT-06 | Puerto como string numérico | `kof98, "6003", "10.0.0.1", "6004", 0` | debe hacer coercion o rechazar | `test_ggpo_unit.js` |
| UT-07 | Rom name vacío | `"", 6003, "10.0.0.1", 6004, 0` | debe lanzar error | `test_ggpo_unit.js` |

### 1.2 `findFcadefbneo()`

| ID | Escenario | Expected |
|----|-----------|----------|
| UT-08 | Binario existe en `resources/fcadefbneo/fcadefbneo.exe` | Retorna path absoluto |
| UT-09 | Binario existe en `resources/extraResources/fcadefbneo.exe` | Retorna path absoluto |
| UT-10 | Binario existe en project root | Retorna path absoluto |
| UT-11 | Binario no existe en ninguna ubicación | Retorna null |
| UT-12 | Binario existe pero sin permisos de ejecución | Retorna null o lanza error |
| UT-13 | Modo empaquetado (Electron) — busca en `process.resourcesPath` | Retorna path en extraResources |

### 1.3 `resolveGgpoIp()`

| ID | Escenario | Expected |
|----|-----------|----------|
| UT-14 | Mode 'lan' con red activa | Retorna IP LAN (formato 192.168.x.x) |
| UT-15 | Mode 'lan' sin red | Retorna 127.0.0.1 o lanza error |
| UT-16 | Mode 'tailscale' con Tailscale activo | Retorna IP 100.x.x.x |
| UT-17 | Mode 'tailscale' sin Tailscale | Lanza error "Tailscale no detectado" |
| UT-18 | Mode desconocido 'bore' | Lanza error "Modo no soportado para GGPO" |
| UT-19 | Mode 'lan' con múltiples interfaces de red | Retorna la primera IP no-loopback |

### 1.4 `findAvailableUdpPort()`

| ID | Escenario | Expected |
|----|-----------|----------|
| UT-20 | Puerto 6003 libre | Retorna 6003 |
| UT-21 | Puerto 6003 ocupado, 6004 libre | Retorna 6004 |
| UT-22 | Puertos 6003-6005 ocupados | Retorna 6006 o lanza error tras N intentos |
| UT-23 | Sin puertos libres en rango 6003-6100 | Lanza error "No hay puertos UDP disponibles" |
| UT-24 | Timeout en verificación de puerto | Lanza error después de N segundos |

### 1.5 `publishGgpoRoom()` / `fetchGgpoRoom()` / `updateGgpoRoom()` / `deleteGgpoRoom()`

| ID | Escenario | Expected |
|----|-----------|----------|
| UT-25 | Publicar sala con datos válidos | Storage write exitoso |
| UT-26 | Publicar sala sin IP | Lanza error |
| UT-27 | Leer sala existente | Retorna objeto GgpoRoom |
| UT-28 | Leer sala inexistente | Retorna null |
| UT-29 | Actualizar sala con guest info | Storage update exitoso |
| UT-30 | Actualizar sala que no existe | Lanza error |
| UT-31 | Eliminar sala existente | Storage delete exitoso |
| UT-32 | Eliminar sala que no existe | No lanza error (idempotente) |
| UT-33 | Publicar sala con Nakama caído | Lanza error con mensaje claro |
| UT-34 | Key malformada | Lanza error |

## 2. Pruebas de Integración (Automatizables)

### 2.1 Flujo host (local)

| ID | Escenario | Expected |
|----|-----------|----------|
| IT-01 | Host crea sala GGPO en LAN | IPC `launch-game-ggpo` responde OK, proceso fcadefbneo iniciado |
| IT-02 | Host crea sala GGPO con Tailscale | IPC responde OK, proceso iniciado con IP Tailscale |
| IT-03 | Host cancela sala antes de que guest se una | IPC `kill-ggpo-process` mata proceso, Storage limpio |
| IT-04 | Host ve guest conectado (polling detecta guest) | Storage actualizado, args actualizados |
| IT-05 | Host timeout (30s sin guest) | Sala se cierra automáticamente, mensaje de timeout |

### 2.2 Flujo guest (local)

| ID | Escenario | Expected |
|----|-----------|----------|
| IT-06 | Guest detecta sala GGPO disponible | `fetchGgpoRoom()` retorna datos del host |
| IT-07 | Guest se une a sala GGPO | IPC `launch-game-ggpo` responde OK, proceso fcadefbneo iniciado |
| IT-08 | Guest se une sin sala disponible | Error "No hay sala GGPO disponible" |
| IT-09 | Guest se une con método incompatible (ej: host en LAN, guest quiere Tailscale) | Error o advertencia |

### 2.3 Toggle UI

| ID | Escenario | Expected |
|----|-----------|----------|
| IT-10 | Toggle cambia de RetroArch a GGPO | Estado `engine` = 'ggpo' |
| IT-11 | Toggle cambia de GGPO a RetroArch | Estado `engine` = 'retroarch' |
| IT-12 | Toggle deshabilitado cuando method = 'bore' | Componente disabled con tooltip |
| IT-13 | Toggle habilitado cuando method = 'lan' | Componente enabled |
| IT-14 | Toggle habilitado cuando method = 'tailscale' | Componente enabled |

### 2.4 Nakama Storage

| ID | Escenario | Expected |
|----|-----------|----------|
| IT-15 | Host publica sala, guest la lee | Datos correctos en ambos lados |
| IT-16 | Host actualiza sala con guest info | Guest puede confirmar que su IP fue registrada |
| IT-17 | Host elimina sala, guest ya no la ve | `fetchGgpoRoom()` retorna null |
| IT-18 | Dos hosts publican sala simultáneamente | Ambos coexisten (keys por userId) |

## 3. Casos Límite (Edge Cases)

| ID | Escenario | Expected |
|----|-----------|----------|
| EC-01 | Guest se une ANTES de que host termine de publicar | Guest reintenta (retry 3 veces con 1s de espera) |
| EC-02 | Host y guest son la misma máquina (localhost) | Ambos procesos spawn, cada uno con su puerto |
| EC-03 | Host cierra app mientras guest está conectado | `before-quit` mata fcadefbneo del host, guest detecta desconexión |
| EC-04 | Guest cierra app mientras host espera | Host detecta que guest nunca apareció → timeout |
| EC-05 | Red WiFi inestable durante partida GGPO | GGPO maneja packet loss nativamente (rollback) |
| EC-06 | Dos guests intentan unirse a la misma sala | Segundo guest recibe "Sala ocupada" |
| EC-07 | Host cambia toggle después de crear sala | Toggle se bloquea mientras sala activa |
| EC-08 | Cambio de red (LAN a WiFi) durante sesión | GGPO debería reconectarse o mostrar error |
| EC-09 | NAT estricto en LAN (sin Tailscale) | `quark:direct` falla (no hay STUN/TURN) |
| EC-10 | ROM kof98 no encontrada por fcadefbneo | fcadefbneo muestra pantalla de error, Emu Latam detecta y muestra mensaje |
| EC-11 | Actualización de fcadefbneo (cambio de args) | El handler debe funcionar con versión específica |
| EC-12 | Empaquetado del EXE — ruta del binario cambia | `findFcadefbneo()` debe funcionar en prod y dev |

## 4. Manejo de Errores

| ID | Escenario | Error Esperado |
|----|-----------|----------------|
| ER-01 | fcadefbneo.exe no encontrado | "Binario GGPO no encontrado. Compilá fcadefbneo primero." |
| ER-02 | Todos los puertos UDP ocupados | "No hay puertos UDP disponibles (6003-6006 ocupados)" |
| ER-03 | Nakama Storage write falla | "Error al publicar sala GGPO: {detalle}" |
| ER-04 | Tailscale no está corriendo | "Tailscale no detectado. Activá Tailscale para usar GGPO." |
| ER-05 | fcadefbneo crash al iniciar | "fcadefbneo se cerró inesperadamente. Código: {code}" |
| ER-06 | fcadefbneo no responde (hang) | Timeout después de 10s → matar proceso, mostrar error |
| ER-07 | Guest tarda más de 30s | "Tiempo de espera agotado. La sala se ha cerrado." |
| ER-08 | Red desconectada durante espera | "Conexión de red perdida. Sala cancelada." |
| ER-09 | Método Bore seleccionado con GGPO | Tooltip: "GGPO no compatible con Bore (usa UDP)" |

## 5. Pruebas de Rendimiento

| ID | Escenario | Métrica | Límite |
|----|-----------|---------|--------|
| PF-01 | Tiempo de spawn de fcadefbneo | < 2s desde click hasta ventana visible | 5s max |
| PF-02 | Tiempo de polling a Nakama Storage | < 500ms por ciclo | 1s max |
| PF-03 | Memoria usada por fcadefbneo | < 200 MB RAM | 500 MB max |
| PF-04 | CPU usage durante partida GGPO | < 30% en CPU moderna | 50% max |
| PF-05 | Tiempo de kill + cleanup | < 1s desde click hasta puertos liberados | 3s max |
| PF-06 | Latencia agregada por el launcher (round-trip) | < 1ms (solo spawn, no proxy) | 5ms max |
| PF-07 | Consumo de disco del binario + DLLs | < 50 MB | 100 MB max |

## 6. Pruebas de No-Regresión (Críticas)

| ID | Escenario | Expected |
|----|-----------|----------|
| NR-01 | Host directo RetroArch (sin bore) | Sigue funcionando exactamente igual |
| NR-02 | Host con bore + join RetroArch | Sigue funcionando exactamente igual |
| NR-03 | Join directo RetroArch (lee relay file) | Sigue funcionando exactamente igual |
| NR-04 | Sistema de retos con RetroArch | Sigue funcionando exactamente igual |
| NR-05 | Tailscale host + join RetroArch | Sigue funcionando exactamente igual |
| NR-06 | Autoconnect (módulo 10) con RetroArch | Sigue funcionando exactamente igual |
| NR-07 | Botón "CERRAR SALA" en modo RetroArch | No afecta procesos GGPO |
| NR-08 | Limpieza global (`before-quit`) con RetroArch activo | No mata GGPO process (si existe) |

## 7. Pruebas de Seguridad

| ID | Escenario | Expected |
|----|-----------|----------|
| SG-01 | Inyección de comandos en `rom` parameter | `buildQuarkArgs()` sanitiza o rechaza caracteres peligrosos |
| SG-02 | IP falsa en Nakama Storage | Guest valida que la IP sea reachable antes de conectar |
| SG-03 | Puerto malicioso (ej: 0, >65535) | Validación de rango, rechazar |
| SG-04 | Guest spoofea su identidad en Storage | Host valida que guestId coincida con userId autenticado |
| SG-05 | Path traversal en `findFcadefbneo()` | Búsqueda limitada a directorios permitidos |

## 8. Pruebas Multiplataforma / Entorno

| ID | Escenario | Expected |
|----|-----------|----------|
| MP-01 | Windows 10 Home | Todo funciona |
| MP-02 | Windows 11 Pro | Todo funciona |
| MP-03 | Windows con firewall bloqueando UDP | Error claro o instrucción para abrir puerto |
| MP-04 | Windows Defender bloquea fcadefbneo | Instrucción para agregar excepción |
| MP-05 | FBNeo compilado en Debug vs Release | Usar siempre Release |
| MP-06 | Resolución de pantalla 1366x768 | Ventana fcadefbneo visible |
| MP-07 | Múltiples monitores | fcadefbneo abre en monitor primario |

## 9. Criterios de Aceptación por Fase

| Fase | Criterio |
|------|----------|
| Compilación | `fcadefbneo quark:direct,...` funciona manualmente en 2 PCs LAN |
| Unit tests | 100% de pruebas UT-01 a UT-34 pasan |
| Integration tests | 100% de pruebas IT-01 a IT-18 pasan |
| Edge cases | 100% de pruebas EC-01 a EC-12 pasan |
| Error handling | 100% de pruebas ER-01 a ER-09 pasan |
| No-regresión | 100% de pruebas NR-01 a NR-08 pasan |
| Performance | Todas las métricas dentro de límites especificados |
| Seguridad | 100% de pruebas SG-01 a SG-05 pasan |
| Empaguetado | EXE distribuible incluye fcadefbneo en extraResources |

## Especificación Técnica para Tests Automatizados

### Test Runner
- Ubicación: `client/test_ggpo_unit.js` (unitarias), `client/test_ggpo_integration.js` (integración)
- Framework: Node.js nativo con `assert` (mismo enfoque que `test_stable_flows.js`)
- Dependencias: `net` (TCP check), `dgram` (UDP check), `child_process` (spawn test)

### Mocking
- `findFcadefbneo()`: mock con paths temporales
- `resolveGgpoIp()`: mock para simular LAN/Tailscale sin red real
- `publishGgpoRoom()`: mock de Nakama Storage (archivo JSON local en `test/data/`)
- `spawnFcadefbneo()`: mock que registra comandos en lugar de ejecutar

### Cobertura mínima requerida
- Unitarias: 90%+ de funciones del módulo
- Integración: Todos los flujos principales (crear sala, unirse, cancelar, cleanup)
- No-regresión: 100% de los flujos RetroArch existentes

## Registro de Resultados

- Los resultados se documentan en `07-Resultados-Testings.md`
- Cada prueba debe tener: ID, resultado (PASS/FAIL), fecha, responsable
- Las pruebas FAIL deben incluir referencia al bug/solución
