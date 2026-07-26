# 🚀 HOJA DE RUTA DETALLADA: FUTURAS MEJORAS (EMU LATAM)

Este documento contiene el plan de acción paso a paso para implementar las mejoras planificadas. Sirve como un checklist estricto para las próximas sesiones de desarrollo.

## ✅ COMPLETADO — Fase 1: Automatización y Experiencia (Local)

El objetivo de esta fase es hacer que la experiencia del usuario sea "un solo clic", ocultando la complejidad del servidor de fondo.

### 1.1. Auto-Lanzamiento de Nakama (Modo Invisible)
- [x] **Investigación & Código:** Modificar `client/src/main/index.ts` usando `child_process.spawn('nakama.exe', ...)` con `windowsHide: true`.
- [x] **⚙️ TEST:** Script JS headless + tasklist. **(EXITOSO - PID 8700)**.
- [x] **Chequeo de Salud:** GET a `127.0.0.1:7350`. No duplicar Nakama.
- [x] **⚙️ TEST:** Dos instancias, segunda detecta Nakama activo. **(EXITOSO)**.
- [x] **Gestión de Cierre:** `window-all-closed` → `process.kill()` a Nakama.
- [x] **⚙️ TEST:** Cierre automático 5s, verificar memoria limpia. **(EXITOSO)**.

### 1.2. Gestión Automática de IP/Túnel (Bypass Manual)
- [x] **Integración de Bore:** Host lanza `bore local 55435 --to bore.pub` (ahora `local 55436`), extrae puerto con Regex.
- [x] **⚙️ TEST:** `test_bore_parser.js` simula stdout. **(EXITOSO - URL bore.pub:12828)**.
- [x] **Actualización Automática a la Nube:** Guardar `bore.pub:XXXX` en Storage de Nakama.
- [x] **⚙️ TEST:** curl a Nakama API, verificar cadena válida. **(EXITOSO)**.
- [x] **🐛 Fix: `--port` ignorado por RetroArch:** Proxy TCP local en `index.ts`.
- [x] **🐛 Fix: `--port` también ignorado en HOST mode:** Forwarder TCP 55436 → LAN IP:55435.
- [x] **🐛 Fix: Proxy y forwarder comparten cleanup:** Arrays separados (`proxyServers` vs `forwarderServers`).
- [x] **🐛 Fix: Forwarder conecta a proxy en vez de host RA:** Forwarder usa `getLanIp()` en vez de `127.0.0.1`.
- [x] **✅ Verificación:** HOST DIRECTO funcional. BORE manual funcional (conexión netplay exitosa).

### 1.3. Configuración Anti-Lag
- [x] Config `netplay_optimized.cfg` con run-ahead, frame delay, hard sync.
- [x] `netplay_check_frames = "3"`, `netplay_input_latency_frames_range = "3"` para tolerancia a latencia de túneles.

### 1.4. Tests de Flujos Blindados
- [x] **`test_stable_flows.js`** con 35 tests: regex, spawn args, proxy TCP, forwarder, cleanup separado, puertos, archivos, bore command.
- [x] **Script npm:** `npm run test:stable`
- [x] **Cobertura:** Directo host/guest, bore host/guest, proxy reenvío, forwarder reenvío, separación cleanup.

---

## 🛠️ NOTA TÉCNICA: PC SECUNDARIA (MAURICIO)
- **Puerto Postgres:** 5433.
- **Acción:** Asegurar que `backend/local.yml` apunte a `127.0.0.1:5433`.

---

## 🚧 Fase 2: Infraestructura Central (Nube / VPS)

### 2.1. Preparación del VPS (Ubuntu/Debian)
- [ ] **Acceso y Despliegue Nakama:** Docker/Compose, puertos `7350`/`7351`.
- [ ] **⚙️ TEST:** curl a `http://IP_VPS:7350` → 200 OK.
- [ ] **⚙️ TEST:** Cliente Node.js login de test en VPS.

### 2.2. Servidor Tunnel Propio (Bore Server)
- [ ] **Bore VPS Backend:** `bore server` en VPS.
- [ ] **⚙️ TEST:** `bore local 55435 --to IP_VPS` + Test-NetConnection.
- [ ] **Integración en BD App:** Endpoint principal en VPS.

### 2.3. Retos (Challenges) vía Nakama
- [x] **Flujo de reto funcional:** Sistema completo implementado y documentado (módulo 08).
- [x] **Documentación completada:** 7 archivos en plan-inicial y plan-actual.

## ✅ COMPLETADO — Módulo 10: Automatización de Conexión

- [x] **Nakama Storage:** `publishHostInfo()` y `fetchHostInfoForUser()` en nakama.ts.
- [x] **Host:** IP se publica automáticamente al CREAR SALA y al presionar HOST TAILSCALE.
- [x] **Host:** Re-publicación periódica cada 30s.
- [x] **Guest:** Auto-descubrimiento de IP del host al conectarse (vía onlineUsers + Storage).
- [x] **UI:** Rediseño sección Tailscale con JOIN + IP en fila horizontal.
- [x] **Documentación completa:** 7 archivos en plan-inicial y plan-actual.

## ✅ COMPLETADO — Auto-Reconexión WebSocket

- [x] **AuthContext.tsx:** Hasta 10 reintentos con 3s de espera al detectar desconexión.
- [x] **Logueo en consola:** `[AUTH] Reintento N/10...`.
- [x] **Cleanup:** `logout()` cancela temporizadores de reconexión.

## ✅ COMPLETADO — Persistencia IP Guest

- [x] **localStorage:** Se guarda la última IP del host al hacer CONECTAR como guest.
- [x] **Auto-recuperación:** Al abrir UNIRSE A SALA se restaura la última IP usada.
- [x] Ya no es necesario re-tipear la IP del host al reiniciar la app.

## ✅ COMPLETADO — Rediseño Sala Creada y Layout

- [x] **SALA CREADA** movida fuera de OTROS MÉTODOS, ahora es lo primero que ve el host.
- [x] **Diseño prominente:** IP grande (1.5rem), glow, borde grueso, instrucciones claras.
- [x] **MODO TAILSCALE** movido dentro de OTROS MÉTODOS junto con LAN, BORE, DEBUG.
- [x] **Divisor visual** entre el estado de sala y los métodos de conexión.

## ✅ COMPLETADO — Prioridad Responsive

- [x] **AppShell.tsx:** Chat se oculta a los 1100px, players a los 800px (antes era al revés).

### 2.4. UX Pulido
- [x] **Copiar IP con 1 click:** IP clickeable en SALA CREADA, feedback "✅ COPIADO!" + timeout 2s.
- [x] **Firewall automático:** Al crear sala se intenta abrir puerto 7350 para Tailscale via `netsh advfirewall`.
- [x] **Health check automático:** Cada 15s se verifica conectividad al peer remoto, con advertencia ⚠ si no responde.
- [x] **Auto-refresh IP Tailscale:** Cada 30s se actualiza la IP mostrada si Tailscale la reasignó.
- [x] **Mostrar nombre personalizado de otros usuarios en sidebar:** Implementado en Módulo 17.
- [x] **Mostrar nombre personalizado en chat (fix):** Resolución en tiempo de render vía `getDisplayName()` + auto-inclusión propio userId en displayNameMap. Commit `dbffd1c`.
- [ ] **Sistema de Notificaciones:** Toast en renderer al recibir reto.
- [ ] **Progreso visual:** Spinners durante conexiones.
- [ ] **Prevención de clicks:** Deshabilitar botones hasta servicios listos.

---

## ✅ COMPLETADO — Fase 3: Relay MITM → Transparent Forwarder

### 3.1. Investigación MITM
- [x] **Confirmar estado de servidores MITM públicos:** Todos caídos.
- [x] **Evaluar compilación de netplay_mitm_server.c:** Código eliminado del repo RetroArch.
- [x] **Decidir implementación:** Node.js nativo en Electron.

### 3.2. Relay MITM Node.js (intento inicial)
- [x] Handshake header echo, post-header, NICK, INFO, SYNC.
- [x] Post-handshake forwarding con pendingQueue.
- [x] Salt zeroeado en header (evita diálogo de password).
- [x] MODE broadcast, INFO/NICK suppression, REQ_SAVE handling.
- [x] **Problema:** Master se desconecta ~2s después de SYNC. Relay no tiene estado de juego.

### 3.3. Transparent Forwarder (solución definitiva)
- [x] Rewrite de `mitm-relay.js`: ~681 líneas MITM → ~60 líneas pipe TCP.
- [x] Host RA usa `--host` (tiene estado real del juego).
- [x] Guest RA usa `--connect` al relay.
- [x] Relay pipea datos entre host y guest (sin lógica de protocolo).
- [x] **Conexión exitosa:** Ambas ventanas RA se conectan y se ven.
- [x] **Lección:** Un relay sin estado de juego NO puede reemplazar un host. La solución real es que RA sea el host.

### 3.4. Integración Electron
- [x] Handler `start-mitm-local` actualizado: host `--host` + waitForPort + relay forwarder.
- [x] Handler `stop-mitm-local`: taskkill retroarch + kill relay.
- [x] Handler paralelo (no toca flujos blindados AGENTS.md §14-15).
- [x] 35/35 tests estables sin regresiones.

---

---

## ✅ Fase 4: Inputs direccionales duplicados en host — RESUELTO

### Causa raíz
**Bug del rollback de RetroArch 1.19.1.** El sistema de rollback/savestate de netplay causaba un desfase de 1 frame al re-procesar inputs del guest, interpretando "releases" como "presses" adicionales.

### Síntoma original
- Guest presiona flecha una vez → personaje se mueve 2 casilleros en pantalla del host
- Guest mantiene abajo → sprite parpadea entre parado/agachado en host
- **Solo en pantalla del host.** Guest ve su personaje suave.
- Ocurre incluso en localhost (misma PC, cable ethernet, sin config custom)

### Hipótesis descartadas (todas probadas, todas fallaron)
- [x] H1: `input_poll_type_behavior = "2"` (late polling de Claude) → ❌
- [x] H2: `netplay_allow_slaves = "false"` (Claude) → ❌
- [x] H3: Conflicto merge check_frames cfg vs appendconfig (Claude) → ❌ ya estaba homogéneo
- [x] H4: Conflicto dinput vs xinput (Claude) → ❌
- [x] H5: `fbneo-socd = "3"` (Claude) → ❌
- [x] Nuclear: `--config` standalone en vez de `--appendconfig` (Claude) → ❌
- [x] Sin ningún config custom → ❌ (persiste en RetroArch puro)

### ✅ Solución intermedia (check_frames=0, no fue suficiente)
```ini
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "0"
netplay_check_frames = "0"
```

### Resultados (check_frames=0)
- **Localhost:** ✅ Parcial. Mejoró pero el doble toque persistía.
- **Cross-PC Tailscale:** ⚠️ Seguía apareciendo.

### ✅ Solución final (run_ahead desactivado + buffer dinámico 1-2 + check_frames=0)
**Causa raíz:**
- `run_ahead_enabled = "true"` → duplicaba inputs del guest en host
- `check_frames > 0` → rollback interrumpía inputs sostenidos (personaje se paraba al agachado)
- `buffer=1` sin range → no daba margen, inputs llegaban tarde

**Solución final en `retroarch/netplay_optimized.cfg` (test [6]):**
```ini
run_ahead_enabled = "false"
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "1"
netplay_check_frames = "0"
```
Con run_ahead=false + buffer dinámico 1-2, no es necesario check_frames porque no hay desync.

### Resultados finales (verificado 16-Jul-2026 cross-PC Tailscale)
- **Jugabilidad:** ✅ MUY BUENA. Respuesta rápida, sin lag perceptible.
- **Parpadeo al agachado:** ✅ Desapareció por completo (check_frames=0)
- **Doble input en pelea:** ✅ No hay
- **Select de personajes:** ⚠️ Mínimo doble visual en host (imperceptible, no afecta)
- **Desync:** ✅ No se detectó
- **Audio:** ✅ Sin cortes

### Retoques postergables
- [x] Probar `latency_frames_min = "2"` → ❌ Se siente lento
- [x] Probar `latency_frames_min = "1"` + `range = "1"` → ✅ MEJOR CONFIG
- [x] Probar `check_frames = "0"` → ✅ Elimina parpadeo al agachado
- [x] Probar `input_block_timeout = 1/3/10` → ❌ No solucionó el tiriteo
- [x] Probar `check_frames = 300` + `input_block_timeout` → ❌ Causó desync de audio
- [ ] Probar RetroArch 1.18.0/1.16.0 para ver si tienen netplay nativo mejor
- [ ] Test con otro core (Snes9x) para aislar si es específico de FBNeo

### Hallazgo importante (18-Jul-2026)
- [x] **El tiriteo con check_frames > 0 ocurre en AMBAS PCs.**
  El Ryzen lo muestra muy notorio (rítmico, sincrónico con el intervalo
  check). El Athlon lo muestra casi imperceptible. Afecta todos los inputs
  direccionales (↓ ← →), no solo el agachado.
  Ver test [9] en `DOCUMENTACION/12-Test-Latencia-Buffer/plan-actual/04-Codigo.md`.

---

*(Al concluir cada fase, el asistente correrá los 'TEST AUTOMÁTICO' indicados y documentará los resultados)*

---

## ✅ Fase 5: Propuestas de Mejoras de Modelos (Módulo 06)

- [x] **Propuesta de DeepSeek V4 Flash Free:** Mantenibilidad y dockerización de VPS.
- [x] **Propuesta de Nemotron 3 Ultra:** Reestructuración exhaustiva y modularización del Main Process.
- [x] **Propuesta de Gemini 3.5 Flash:** Diagnóstico de Tailscale, watchdog central de procesos, comandos UDP de control, handshake en forwarder y replays de Nakama.

## ✅ Módulo 13 — Editor de Configuración Netplay (19-Jul-2026)

- [x] **IPC handlers:** `read-netplay-config`, `write-netplay-config`, `restore-netplay-config` en index.ts
- [x] **NetplayConfigModal.tsx:** Modal con check_frames, latency min/range, run-ahead, input_block_timeout
- [x] **Tooltips en español:** CSS tooltip con 1s de delay en cada campo
- [x] **Integración UI:** Botón ⚙ en Header → AppShell → App.tsx
- [x] **netplay_optimized.cfg:** Agregada clave `netplay_input_block_timeout = "0"`
- [x] **ChallengeModal:** Botón de cierre (×) en estados accepted/rejected/timeout + resetChallenge expuesto
- [x] **Swap de colores:** Tailscale ahora turquesa (#00f3ff), Bore ahora azul (#0af)
- [x] **Simplificación UI:** Tailscale y Sala Creada movidos dentro de "OTROS MÉTODOS DE CONEXIÓN"
- [x] **npm run dev:** Compila sin errores
- [x] **Commits:** 27f1ad0, c431629, 3ae7db9

---

## ✅ Módulo 14 — Integración FBNeo-GGPO (21-Jul-2026)

### 14.1. Investigación y Setup
- [x] Investigación de `quark:direct` CLI args para FBNeo con GGPO
- [x] Verificación: `fcadefbneo.exe` soporta `quark:direct` con `cwd` en su directorio
- [x] Copia de `fcadefbneo/` desde Fightcade a `client/resources/fcadefbneo/` (self-hosted)
- [x] `.gitignore` para excluir binarios/DLLs/ROMs

### 14.2. Handler IPC (Main Process)
- [x] `findFcadefbneo()` busca en `client/resources/fcadefbneo/` primero
- [x] `spawnFcadefbneo()` lanza fcadefbneo con `cwd` correcto
- [x] `spawnLocalTest()` lanza dos instancias (host+guest) para test local
- [x] `killGgpo()` mata procesos GGPO
- [x] `getGgpoProcess()` expone proceso activo
- [x] Handler `ggpo-launch-local` para test local
- [x] Handler `get-lan-ip` con auto-detección (Tailscale > LAN)
- [x] `ipcChannels.ts` whitelist actualizado con 4 canales + get-lan-ip
- [x] `preload/index.ts` expone `ggpoLaunch`, `ggpoKill`, `ggpoLaunchLocal`, `getLanIp`

### 14.3. Red / Nakama Storage
- [x] `ggpoNet.ts` con helpers para publicar/descubrir salas GGPO
- [x] Publicación automática de sala al hacer HOST
- [x] Descubrimiento automático de salas para guest (GgpoGuestView)

### 14.4. Contexto y Estado
- [x] `GgpoContext.tsx` con máquina de estados (idle, waiting_guest, joining, connected, error)
- [x] Polling periódico para detección guest (cada 3s)
- [x] Auto-refresh IP cada 30s

### 14.5. UI (Renderer)
- [x] `GgpoToggle.tsx` — toggle engine entre RetroArch y GGPO
- [x] `GgpoHostView.tsx` — pantalla de espera con IP clickeable
- [x] `GgpoGuestView.tsx` — descubrimiento automático de salas
- [x] Rediseño unificado: mismas 4 secciones (Tailscale, LAN, Bore, Debug) adaptadas por engine
- [x] Bore deshabilitado en GGPO (UDP incompatible con TCP)
- [x] TEST LOCAL GGPO en sección Debug (sin alert molesto)
- [x] `GgpoGuestView` fuera del Collapsible, visible solo en idle GGPO

### 14.6. Testing y Verificación
- [x] Build exitoso (`npm run build`)
- [x] TEST LOCAL GGPO funcional (dos ventanas fcadefbneo)
- [x] Sin regresiones en flujos RetroArch existentes
- [x] Carpeta `fcadefbneo/` vacía en raíz eliminada

### 14.7. Documentación
- [x] Módulo 14 creado en `DOCUMENTACION/14-Integracion-FBNeo-GGPO/`
- [x] 7 archivos en plan-inicial y plan-actual
- [x] `DOCUMENTACION/README.md` actualizado
- [x] AGENTS.md §10 actualizado con reglas de chat entre modelos
- [x] Documentación del flujo de test local
- [x] Commits: eb97aea, d2cd8b9, 8a5933a, 252786f, af848e8, 46e88d0

### 14.8. Integración con Sistema de Retos
- [x] `main.tsx` — GgpoProvider ahora envuelve a ChallengeProvider
- [x] ChallengeContext importa `useGgpo()` para leer `engine`
- [x] Host con GGPO: detecta IP, envía `ggpoHostIp`, espera `challenge_guest_ready`
- [x] Guest con GGPO: recibe IP, detecta IP propia, lanza GGPO como player 1
- [x] Nuevo mensaje: `CHALLENGE_GUEST_READY_MSG_TYPE` con `{ guestIp }`
- [x] Host recibe guest_ready y lanza GGPO como player 0 con la IP del guest
- [x] Bore rechazado explícitamente en GGPO con alert

### 14.9. Fix Flujo Manual (GgpoGuestView)
- [x] `updateGgpoRoom` eliminado (fallaba por permisos Storage)
- [x] `joinRoom()` ahora publica sala propia con `targetHostId`
- [x] `findGuestRoomsForHost()` busca guests por `targetHostId`
- [x] Host polling usa `findGuestRoomsForHost()` en vez de `fetchGgpoRoom()`
- [x] `onlineUsersRef` para evitar closures stale
- [x] Verificado funcional con segunda PC por Tailscale

### 14.10. Fix Descubrimiento de Salas — Lobby Messages
- [x] **Diagnóstico:** `readStorageObjects()` con `user_id` no devuelve salas de otros usuarios
- [x] **Solución:** Reemplazar Nakama Storage por lobby messages (chat) para descubrimiento
- [x] Mensaje `ggpo_room_open` — host anuncia sala al lobby al hacer HOST
- [x] Mensaje `ggpo_room_close` — host elimina sala al cancelar
- [x] Mensaje `ggpo_guest_join` — guest notifica al host al unirse
- [x] `GgpoContext.tsx` reescrito: mensajes vía `window.addEventListener("nakama_message", ...)`
- [x] Eliminado polling a Storage (reemplazado por listener de eventos en tiempo real)
- [x] `ggpoNet.ts` limpiado: Storage helpers preservados pero no usados en flujo principal
- [x] Build pasa sin errores

---

## ✅ Módulo P2P Propio — Conexión LAN entre PCs (24-Jul-2026)

- [x] Módulo independiente `p2p-module/` con 29 tests, 0 dependencias runtime
- [x] IPCs registrados: `p2p-host`, `p2p-guest`, `p2p-host-register-guest`, `p2p-disconnect`
- [x] Bridge Electron `p2pBridge.ts`: host/guest/forwarder management
- [x] Botones "HOST P2P" y "JOIN P2P" en App.tsx bajo OTROS MÉTODOS
- [x] Auto-descubrimiento host candidate via Nakama Storage
- [x] Guest publica candidate, host confirma via `connection_confirmed`
- [x] Detección LAN: `anySameSubnet()` + priorizar IP real sobre Tailscale
- [x] Modo LAN: salta forwarder, conecta directo a `hostLanIp:55435`
- [x] Forwarder con fallback EADDRINUSE a puerto aleatorio + `--port`
- [x] PUNCH handler en P2PManager para que `doHolePunch` funcione
- [x] **Verificado funcional en misma LAN (24-Jul-2026)**
- [x] Integrado con sistema de Retos (método "p2p" automático)
- [x] METHOD_META agregado en ChallengeModal evita crash con método p2p
- [x] getLanIp() corregido para excluir IPs Tailscale del broadcast
- [ ] Pendiente: probar entre PCs en distintas redes (WAN con Nakama)

## ✅ Módulo 18b — P2P Propio WAN Manual + UPnP + Firewall (26-Jul-2026)

### Implementación
- [x] RELAY_REQUEST (0x07) / RELAY_ACK (0x08) agregados a protocol/types.ts
- [x] P2PManager.handlePacket maneja RELAY_REQUEST/RELAY_ACK
- [x] P2PManager.startJoinWan(): hole punch + fallback RELAY_REQUEST con timeout 8s
- [x] waitForRelayAck(): helper para esperar RELAY_ACK en guest
- [x] handleP2PGuestWan() en p2pBridge.ts: parsea IP:puerto manual, llama startJoinWan
- [x] IPC handler p2p-guest-wan registrado en index.ts + ipcChannels.ts
- [x] UI fucsia: host muestra IP pública + LAN + UPnP status; guest input IP:puerto
- [x] UPnP automático: `nat-upnp` abre puerto al crear sala (IP LAN real excluye Tailscale)
- [x] Windows Firewall automático: `netsh` crea regla para puerto P2P
- [x] Build TypeScript + Vite sin errores
- [x] p2p-module 29/29 tests pasando
- [x] Stable flows 50/51

### Bugs corregidos (26-Jul-2026)
- [x] **waitForRelayAck bug:** Escuchaba `'message'` en vez de `'raw-message'` → nunca se ejecutaba
- [x] **UPnP local IP:** Mapeaba a IP Tailscale (100.x.x.x) en vez de LAN real
- [x] **UPnP private port:** Usaba puerto STUN en vez del bound real del transporte
- [x] **Firewall regla:** Usaba puerto STUN en vez del bound real

### UI Reorder (26-Jul-2026)
- [x] Tailscale primero
- [x] Bootstrap verde segundo
- [x] P2P fucsia tercero (al fondo)

### Test manual WAN desde celular (26-Jul-2026)
- [ ] ❌ **FALLÓ** — Router ISP no aplica UPnP (puerto cerrado desde internet)
- [ ] Pendiente: probar con port forwarding manual en router
- [ ] Pendiente: probar en otro ISP que sí aplique UPnP

---

## ✅ Módulo 19 — GGPO+P2P WAN (Relay UDP vía P2P) (24-Jul-2026)

- [x] Módulo `ggpoP2PBridge.ts` independiente y paralelo a `p2pBridge.ts` con estado global separado (tokenCounter empieza en 200)
- [x] `handleGGPOP2PHost()`: P2PManager startHost, retorna candidate vía Nakama
- [x] `handleGGPOP2PGuest()`: P2PManager startJoin, auto-detecta LAN/WAN; si WAN crea forwarder local, si LAN retorna hostLanIp
- [x] `handleGGPOP2PHostRegisterGuest()`: registra guest, crea relay socket en 127.0.0.1:0 ↔ GGPO host :6003 ↔ P2P transport
- [x] `handleGGPOP2PDisconnect()`: limpia sockets, managers y resetea tokenCounter
- [x] 4 IPCs registrados: `ggpo-p2p-host`, `ggpo-p2p-guest`, `ggpo-p2p-register-guest`, `ggpo-p2p-disconnect`
- [x] Canales whitelisteados en `ipcChannels.ts`
- [x] ChallengeContext.tsx modificado con ramas WAN/LAN en acceptChallenge y ACCEPT handler
- [x] `ggpoForwarderPortRef` y `ggpoRelayPortRef` para pasar puertos entre accepts y connection_info
- [x] connection_info handler: rama WAN (`useGgpoRelay`) usa forwarderPort → GGPO guest conecta a 127.0.0.1
- [x] guest_ready handler: rama WAN (relayPort > 0) → GGPO host conecta a 127.0.0.1:relayPort
- [x] **Pipeline testado (17 tests, 100%)**: guest → forwarder → P2P → relay → host GGPO :6003 → eco → relay → forwarder → guest
- [x] Auto-detección LAN/WAN en flujo completo
- [x] Regresión: `test_stable_flows.js` 50/51, `test_p2p_ggpo.js` 39/39
- [x] Build TypeScript + Vite sin errores
- [x] Documentación completa en `DOCUMENTACION/19-GGPO-P2P-WAN/` con 7 archivos
- [ ] Pendiente: probar entre 2 PCs en distintas redes (WAN real)

---

## ✅ Módulo 20 — Bootstrap Público WAN (24-Jul-2026)

- [x] Módulo `bootstrap.ts` con 7 funciones: publishBoreUrl, fetchBoreUrl, startNakamaBore, setNakamaConfigRemote, restoreNakamaLocalhost, handleBootstrapHost, handleBootstrapGuest, handleBootstrapClose
- [x] 3 IPCs registrados: `bootstrap-host`, `bootstrap-guest`, `bootstrap-close`
- [x] Canales whitelisteados en `ipcChannels.ts`
- [x] UI en App.tsx: sección verde "SALA PÚBLICA" con botón ABRIR SALA, input código, room code grande + copiar, fallback manual, cerrar sala
- [x] Host: spawn bore para puerto 7350 (Nakama) + publica URL en dpaste.org → room code de 6 caracteres
- [x] Guest: ingresa room code → fetch desde dpaste → configura Nakama remoto en `emu_latam_nakama.json`
- [x] Fallback automático: si dpaste falla, muestra URL manual para copiar
- [x] 34 tests, 100% (inline logic + verificación archivos fuente)
- [x] Regresión: test_stable_flows.js 50/51, test_p2p_ggpo.js 39/39, test_ggpo_p2p_wan.js 17/17
- [x] Build TypeScript + Vite sin errores
- [x] Documentación completa en `DOCUMENTACION/20-Bootstrap-WAN/` con 7 archivos
- [x] Fix 26-Jul: RA host→guest return path (relay UDP roto → proxy TCP estable)
- [x] Fix 26-Jul: `startGameBoreTunnel()` en bootstrap.ts — bore game relay 55436 sin taskkill global
- [x] Fix 26-Jul: `bootstrap-start-game-relay` / `bootstrap-stop-game-relay` IPC handlers + cleanup
- [x] Fix 26-Jul: `ChallengeContext.tsx` RA host usa game bore + forwarder; RA guest usa proxy existente
- [x] Fix 26-Jul: `bootstrapGgpoRelay.ts` — sockets UDP persistentes, handler duplicado eliminado

---

## 🔄 Módulo 21 — Reestructuración UI de Conexión y Unificación de Salas (24-Jul-2026)

### 21.1. Planificación e Investigación
- [x] Análisis del problema de los 6 botones y la sección colapsable redundante
- [x] Definición del nuevo flujo: 4 botones en 2 secciones (SALA TAILSCALE + SALA P2P)
- [x] Diseño de auto-detección LAN vs WAN
- [x] Matriz de filtrado dinámico para `MethodPicker` (contexto `salaType` + `engine`)
- [x] Documentación inicial de 7 archivos en `DOCUMENTACION/21-Reestructuracion-UI-Conexion/plan-inicial/`
- [x] Copia a `plan-actual/`
- [x] Mensaje detallado para el próximo agente en `Mensajes entre modelos/02-Reestructuracion-UI-Conexion/`

### 21.2. Implementación UI y Refactor de Estados (Pendiente de Ejecución)
- [ ] Refactorizar variables de estado en `App.tsx` (`salaType: "tailscale" | "p2p" | null`)
- [ ] Refactorizar pantalla principal: unificar fucsia + verde en la nueva sección verde "SALA P2P"
- [ ] Implementar `handleCreateSalaP2p` y `handleJoinSalaP2p` (auto LAN 4s + fallback código)
- [ ] Eliminar la sección colapsable "OTROS MÉTODOS DE CONEXIÓN" de `App.tsx`
- [ ] Agregar botón discreto `[DEBUG]` al fondo
- [ ] Hacer dinámico `MethodPicker.tsx` según props `salaType` y `engine`
- [ ] Actualizar `ChallengeModal.tsx` y `ChallengeContext.tsx`
- [ ] Ejecutar plan de testings (`06-Plan-Testings.md`) y volcar en `07-Resultados-Testings.md`

---

## ✅ Módulo 22 — NAT Traversal (STUN + Hole Punching) (26-Jul-2026)

- [x] Módulo `natTraversal.ts` con STUN client (RFC 5389), hole punch, keep-alive, bridge
- [x] 4 IPC handlers registrados: `nat-traversal-discover`, `nat-traversal-punch`, `nat-traversal-keepalive`, `nat-traversal-stop`
- [x] Canales whitelisteados en `ipcChannels.ts`
- [x] Integración en `ChallengeContext.tsx`: método NAT prioritario antes de bore (GGPO)
- [x] Detección NAT simétrica (2 requests STUN, si puerto cambia → saltear)
- [x] Host: discover → conn_info → guest_ready → punch → launch GGPO
- [x] Guest: conn_info → discover → punch → guest_ready → launch GGPO
- [x] 37 tests, 100% (unitarios + integración localhost + verificación archivos)
- [x] Regresión: test_stable_flows.js 50/51, build sin errores
- [x] Documentación completa en `DOCUMENTACION/22-NAT-Traversal-STUN-HolePunching/` con 7 archivos
- [ ] Pendiente: prueba WAN real entre 2 PCs en distintas redes
- [ ] Pendiente: fallback automático a bore si NAT falla (actualmente alerta)
- [ ] Pendiente: soporte para RA (TCP hole punching)

