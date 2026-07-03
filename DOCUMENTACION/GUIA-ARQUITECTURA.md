# Guía de Arquitectura - Emu Latam

**Objetivo:** Proporcionar una visión completa del sistema Emu Latam para nuevos desarrolladores, explicando cómo interactúan todos los componentes (Nakama, Bore, RetroArch, Electron, React).

---

## Visión General del Sistema

Emu Latam es un launcher estilo Fightcade para jugar KOF '98 online P2P usando RetroArch. El sistema combina:

- **Frontend:** React + Vite (interfaz de usuario)
- **Backend/Desktop:** Electron (gestión de procesos del sistema)
- **Matchmaking:** Nakama (servidor local para autenticación y señalización)
- **Túneles:** Bore (crea túneles TCP públicos sin abrir puertos)
- **Emulación:** RetroArch (core FBNeo para KOF '98)

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                        Usuario                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Renderer Process (React)                      │
│  - Interfaz de usuario (botones, estado, feedback visual)      │
│  - ChallengeContext (flujo de retos)                           │
│  - Comunicación con Main Process vía IPC                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ IPC (contextBridge)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Main Process (Electron)                       │
│  - Gestión de child_process (Nakama, Bore, RetroArch)           │
│  - Proxy TCP (guest side)                                      │
│  - Forwarder TCP (host side)                                    │
│  - MITM Relay (Node.js)                                        │
│  - Handlers IPC para comunicación con React                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ child_process.spawn()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Servicios Externos                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Nakama     │  │    Bore      │  │    RetroArch         │  │
│  │  (matchmaking│  │  (túneles    │  │  (emulación netplay) │  │
│  │   + auth)    │  │   TCP)       │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes del Sistema

### 1. Renderer Process (React)

**Ubicación:** `client/src/renderer/`

**Responsabilidades:**
- Renderizar la interfaz de usuario
- Manejar el estado de la aplicación (conectado, desconectado, cargando)
- Mostrar progreso visual (spinners, loaders) durante operaciones de red
- Enviar comandos al Main Process vía IPC
- Recibir actualizaciones de estado del Main Process vía IPC

**Archivos clave:**
- `App.tsx` - Componente principal, botones Host/JOIN/Directo
- `context/ChallengeContext.tsx` - Flujo de retos vía Nakama

**Comunicación:**
- Usa `window.electron.*` expuesto vía contextBridge
- Llama a handlers IPC como `launch-game`, `start-relay-tunnel`, `start-mitm-local`

### 2. Main Process (Electron)

**Ubicación:** `client/src/main/index.ts`

**Responsabilidades:**
- Gestionar procesos hijos (Nakama, Bore, RetroArch)
- Implementar proxy TCP para guest side
- Implementar forwarder TCP para host side
- Implementar MITM relay (Node.js)
- Exponer handlers IPC para comunicación con React
- Manejar cleanup de procesos al cerrar la aplicación

**Archivos clave:**
- `index.ts` - Todo el backend Electron
- `preload/index.ts` - Exposición de IPC vía contextBridge

**Funciones clave:**
- `spawnNakama()` - Lanza Nakama en modo oculto
- `waitForPort(port)` - Espera a que un puerto esté disponible
- `startProxy(targetHost, targetPort)` - Crea proxy TCP
- `startPortForwarder(listenPort, targetPort)` - Crea forwarder TCP
- `stopAllProxies()` - Limpia proxies del guest
- `stopAllForwarders()` - Limpia forwarders del host

### 3. Nakama (Matchmaking + Auth)

**Ubicación:** `backend/nakama.exe`

**Responsabilidades:**
- Autenticación de usuarios
- Matchmaking (encontrar oponentes)
- Almacenamiento de relay URLs (para túneles bore)
- Health check (verificación de disponibilidad)

**Configuración:**
- `backend/local.yml` - Configuración de conexión a PostgreSQL
- Puerto 7350 (API), 7351 (gRPC)

**Comunicación:**
- Main Process hace health check a `http://127.0.0.1:7350/healthcheck`
- React interactúa vía Nakama SDK (a través de Main Process)

### 4. Bore (Túneles TCP)

**Ubicación:** `relay-server/bore.exe`

**Responsabilidades:**
- Crear túneles TCP públicos sin abrir puertos en el router
- Exponer un puerto local a internet (bore.pub)

**Comando típico:**
```bash
bore local 55436 --to bore.pub
```

**Salida:**
```
bore.pub:12828  # Puerto público aleatorio
```

**Uso en Emu Latam:**
- Host: Expone forwarder en puerto 55436
- Guest: Se conecta a bore.pub:XXXXX vía proxy

### 5. RetroArch (Emulación Netplay)

**Ubicación:** `retroarch/retroarch.exe`

**Responsabilidades:**
- Ejecutar el core FBNeo para KOF '98
- Manejar netplay P2P (host o guest)
- Aplicar configuraciones anti-lag

**Configuraciones:**
- `netplay_optimized.cfg` - Config anti-lag (run-ahead, frame delay)
- `netplay_mitm.cfg` - Config para modo MITM relay

**Args de línea de comandos:**
- Host: `--host --port 55435` (ignora --port, siempre usa 55435)
- Guest: `--connect IP --port 55435` (ignora --port, siempre usa 55435)
- MITM: `--connect 127.0.0.1 --appendconfig netplay_mitm.cfg`

---

## Flujos de Conexión

### Flujo 1: HOST DIRECTO (sin bore)

**Uso:** Prueba local en misma PC, sin túneles.

```
┌─────────────┐
│  Host RA    │ --host --port 55435 (escucha en 0.0.0.0:55435)
└─────────────┘
       ▲
       │ conexión directa
       │
┌─────────────┐
│  Guest RA   │ --connect 127.0.0.1 --port 55435
└─────────────┘
```

**Características:**
- Sin proxy, sin túnel, sin forwarder
- Solo para pruebas locales
- Relay URL guardada: `127.0.0.1:55435`

**Handler IPC:** `launch-game` con `useRelay=false`

---

### Flujo 2: HOST GAME (BORE) manual

**Uso:** Jugar online con túnel bore sin abrir/router.

```
┌─────────────┐
│  Host RA    │ --host --port 55435 (escucha en 0.0.0.0:55435)
└──────┬──────┘
       │ LAN_IP:55435
       ▼
┌─────────────┐
│  Forwarder  │ escucha en 127.0.0.1:55436 → reenvía a LAN_IP:55435
└──────┬──────┘
       │ 55436
       ▼
┌─────────────┐
│    Bore     │ bore local 55436 --to bore.pub
└──────┬──────┘
       │ bore.pub:XXXXX
       ▼
┌─────────────┐
│  Guest Proxy│ escucha en 127.0.0.1:55435 → reenvía a bore.pub:XXXXX
└──────┬──────┘
       │ 127.0.0.1:55435
       ▼
┌─────────────┐
│  Guest RA   │ --connect 127.0.0.1
└─────────────┘
```

**Características:**
- Forwarder usa `getLanIp()` para evitar conflicto con proxy en 127.0.0.1:55435
- Bore crea túnel público sin abrir puertos
- Proxy en guest reenvía a bore.pub

**Handlers IPC:**
- `start-relay-tunnel` (V1, regex `bore.pub:\d+`)
- `launch-game` con `useRelay=true`

---

### Flujo 3: MITM LOCAL

**Uso:** Pruebas de relay MITM local para debugging.

```
┌─────────────┐
│ Master RA   │ --connect 127.0.0.1 --appendconfig netplay_mitm.cfg
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ MITM Relay  | node relay-server/mitm-relay.js (escucha en 55435)
│  (Node.js)  │ Handshake: header→post-header→nick→info→sync
└──────┬──────┘       Post-handshake: INPUT/NOINPUT/LOAD_SAVE/SPECTATE/PLAY
       │
       ▼
┌─────────────┐
│ Guest RA    │ --connect 127.0.0.1 --appendconfig netplay_mitm.cfg
└─────────────┘
```

**Características:**
- Ambos RAs se conectan en modo cliente (ninguno usa --host)
- Relay implementa handshake netplay completo
- Sin proxy, sin forwarder, sin bore
- Relay maneja todo el forwarding de comandos

**Handlers IPC:**
- `start-mitm-local` (spawn relay + ambos RAs)
- `stop-mitm-local` (kill relay)

---

## Arquitectura de Puertos

| Componente | Puerto | Propósito | Notas |
|-----------|--------|-----------|-------|
| Nakama API | 7350 | API HTTP para matchmaking/auth | Health check en /healthcheck |
| Nakama gRPC | 7351 | API gRPC para comunicación real-time | |
| Host RA | 55435 | Netplay host (default, no se puede cambiar) | RetroArch ignora --port |
| Guest Proxy | 55435 (127.0.0.1) | Forward guest RA → bore.pub | Conflicto con host RA en misma PC |
| Forwarder | 55436 (127.0.0.1) | Forward bore tunnel → host RA | Usa LAN IP para evitar conflicto |
| Bore tunnel | 55436 → bore.pub | Túnel TCP público | Puerto público aleatorio |
| MITM Relay | 55435 (Node.js) | Relay central para modo MITM local | |
| Vite Dev Server | 5173 | Servidor de desarrollo React | Solo en modo dev |

---

## Hallazgos Técnicos Críticos

### 1. RetroArch ignora `--port`

**Problema:** RetroArch ignora el argumento `--port` tanto en modo host como en modo cliente.

**Evidencia:**
- Host: `--host --port 55436` → escucha en 55435 (default)
- Guest: `--connect host --port 9999` → conecta a 55435 (default)
- `netplay_port` en config también es ignorado vía `--appendconfig`

**Solución:**
- TCP proxy en guest (55435 → bore URL)
- TCP forwarder en host (55436 → LAN IP:55435)
- Forwarder usa `getLanIp()` para evitar conflicto con proxy

### 2. Conflicto de puerto en misma PC

**Problema:** Host RA y guest proxy no pueden compartir 127.0.0.1:55435.

**Solución:**
- Forwarder conecta al host RA vía LAN IP (192.168.x.x) en vez de 127.0.0.1
- Esto evita que la conexión del forwarder caiga en el proxy del guest

### 3. Cleanup de servidores independiente

**Problema:** Si el guest cierra, no debe matar el forwarder del host.

**Solución:**
- Arrays separados: `proxyServers[]` (guest) y `forwarderServers[]` (host)
- `stopAllProxies()` se llama al cerrar GUEST RA
- `stopAllForwarders()` se llama al cerrar HOST RA

---

## Ciclo de Vida de la Aplicación

### 1. Inicio (`npm run dev`)

```
1. Compila Main Process (index.ts → out/main/index.js)
2. Compila Preload (preload/index.ts → out/preload/index.js)
3. Inicia Vite dev server (http://localhost:5173)
4. Abre ventana de Electron
5. Main Process lanza Nakama (child_process.spawn)
6. React hace health check a Nakama
7. Botón "INSERT COIN" se habilita cuando Nakama responde
```

### 2. Host crea sala

```
1. Usuario hace click en "HOST GAME (BORE)"
2. React llama a IPC handler start-relay-tunnel
3. Main Process:
   - Crea forwarder TCP (55436 → LAN_IP:55435)
   - Lanza bore (local 55436 --to bore.pub)
   - Parsea salida bore para obtener URL (bore.pub:XXXXX)
   - Guarda URL en Nakama Storage
4. Main Process lanza RetroArch host (--host --port 55435)
5. Usuario comparte URL bore.pub:XXXXX con guest
```

### 3. Guest se une

```
1. Usuario hace click en "JOIN GAME"
2. React llama a IPC handler launch-game con useRelay=true
3. Main Process:
   - Lee relay URL de Nakama Storage
   - Crea proxy TCP (127.0.0.1:55435 → bore.pub:XXXXX)
   - Lanza RetroArch guest (--connect 127.0.0.1)
4. Guest RA se conecta al proxy, proxy reenvía a bore, bore reenvía a forwarder, forwarder reenvía a host RA
5. Netplay comienza
```

### 4. Cierre

```
1. Usuario cierra ventana de Electron
2. Main Process:
   - Mata Nakama (process.kill())
   - Mata RetroArch (process.kill())
   - Mata bore (process.kill())
   - Limpia proxies (stopAllProxies())
   - Limpia forwarders (stopAllForwarders())
   - Mata MITM relay si está activo
3. Todos los procesos mueren limpiamente
```

---

## Archivos Clave y Responsabilidades

### Backend Electron

| Archivo | Responsabilidad |
|---------|---------------|
| `client/src/main/index.ts` | Todo el backend: IPC, proxy, forwarder, spawns, cleanup |
| `client/src/preload/index.ts` | Exposición de IPC vía contextBridge a React |

### Frontend React

| Archivo | Responsabilidad |
|---------|---------------|
| `client/src/App.tsx` | UI principal, botones Host/JOIN/Directo, estado de conexión |
| `client/src/context/ChallengeContext.tsx` | Flujo de retos vía Nakama |

### Servicios Externos

| Archivo | Responsabilidad |
|---------|---------------|
| `backend/nakama.exe` | Matchmaking, auth, almacenamiento de relay URLs |
| `backend/local.yml` | Configuración de Nakama (conexión a PostgreSQL) |
| `relay-server/bore.exe` | Túneles TCP públicos |
| `retroarch/retroarch.exe` | Emulación netplay |
| `retroarch/netplay_optimized.cfg` | Config anti-lag (run-ahead, frame delay) |
| `retroarch/netplay_mitm.cfg` | Config MITM relay |
| `relay-server/mitm-relay.js` | Relay MITM Node.js (handshake netplay + forwarding) |

### Tests y Logs

| Archivo | Responsabilidad |
|---------|---------------|
| `client/test_stable_flows.js` | 35 tests automatizados de flujos blindados |
| `logs/main_process.log` | Log completo del main process con timestamps |
| `Logs/` | Registro de cambios cronológico del proyecto |

---

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia entorno completo (Vite + Electron + Nakama) |
| `npm run build` | Compila para producción |
| `npm run lint` | Ejecuta linter TypeScript/ESLint |
| `npm run test:stable` | Ejecuta 35 tests de flujos blindados |

---

## Próximos Pasos para Nuevos Desarrolladores

1. **Leer `COMO-LEVANTAR-EL-PROYECTO.md`** - Guía paso a paso para iniciar el entorno
2. **Revisar `AGENTS.md`** - Reglas de desarrollo y flujo de trabajo
3. **Explorar componentes en `DOCUMENTACION/`** - Documentación detallada por módulo
4. **Ejecutar `npm run test:stable`** - Verificar que los flujos blindados funcionen
5. **Leer logs en `logs/main_process.log`** - Entender el flujo de ejecución real

---

*Última actualización: 2026-07-02*
