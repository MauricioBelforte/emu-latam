# Código de Ejecución - Emu Latam

## Para desarrollar y ejecutar localmente
1. Asegurar que PostgreSQL está corriendo (puerto 5433 en PC de Mauricio).
2. Abrir terminal en `client/`.
3. Ejecutar `npm run dev`.
4. Vite levanta React en puerto 5173, Electron abre ventana principal + ventana guest.
5. Nakama se inicia silenciosamente (requiere PostgreSQL en localhost:5432). Si no está disponible, INSERT COIN funciona en modo local sin Nakama.
6. Tests: `npm run test:stable` (39 tests: 35 originales + 4 Tailscale).

## Estado Actual (Julio 2026) — Flujos Funcionales ✅

### 1. HOST DIRECTO (sin bore) — ✅ BLINDADO, NO MODIFICAR
- **Botón:** "HOST DIRECTO (sin bore)"
- **Host RA:** `--host --port 55435` (default, escucha en 55435)
- **Guest RA:** `--connect 127.0.0.1 --port 55435` (conecta directo al host)
- **Relay URL guardada:** `127.0.0.1:55435`
- Sin proxy, sin túnel. Para prueba local en misma PC.

### 2. HOST GAME (BORE) manual — ✅ BLINDADO, NO MODIFICAR
- **Botones:** "1. HOST GAME (BORE)" → "2. JOIN GAME"
- **Host RA:** `--host --port 55435` (escucha en 0.0.0.0:55435)
- **Forwarder:** Node TCP server `127.0.0.1:55436 → LAN_IP:55435` (host RA)
- **Bore:** `bore local 55436 --to bore.pub` → tunnel `bore.pub:XXXXX`
- **Guest Proxy:** Node TCP server `127.0.0.1:55435 → bore.pub:XXXXX`
- **Guest RA:** `--connect 127.0.0.1` → proxy → bore → forwarder → host RA
- **IPC handlers:** `start-relay-tunnel` (V1, regex `bore.pub:\d+`), `launch-game` (useRelay=true)

### 3. RETO (desafío) — 🚧 EN DESARROLLO
- **IPC handlers:** `start-relay-tunnel-v2` (V2, regex `[\w.-]+:\d+`, IPv4 resolution)
- **IPCs separados:** `kill-retroarch`, `start-relay-tunnel-v2`
- No modifica flujos manuales (AGENTS.md §14-15)
- Pendiente: verificar que host y guest RA no se maten entre sí

### 4. TAILSCALE — ✅ FUNCIONAL
- **Botón:** "HOST TAILSCALE" / "JOIN VÍA TAILSCALE" / "DETENER TAILSCALE"
- **Host RA:** `--host --port 55435 --appendconfig netplay_optimized.cfg`
- **Guest RA:** `--connect <IP> --port 55435 --appendconfig netplay_optimized.cfg`
- **IP:** Auto-detecta 100.x.x.x (Tailscale). Fallback a 127.0.0.1 para test local.
- **Guest** escribe IP manual. Sirve también para conectar por IP LAN real.
- **IPC handlers:** `tailscale-host`, `tailscale-guest`, `stop-tailscale` (paralelos, no tocan flujos blindados).
- **Auth:** INSERT COIN funciona sin Nakama (fallback local).
- **Tests:** 39/39 (4 nuevos tests de spawn args Tailscale).

### 5. TEST MITM LOCAL (forwarder transparente) — ✅ FUNCIONAL
- **Botón:** "TEST MITM LOCAL" (en `App.tsx`)
- **Host RA:** `--host --port 55435 --appendconfig netplay_optimized.cfg` (escucha, estado real)
- **Relay:** `node relay-server/mitm-relay.js 55436 127.0.0.1 55435` (forwarder TCP ~60 líneas)
- **Guest RA:** `--connect 127.0.0.1 --port 55436 --appendconfig netplay_optimized.cfg`
- **Config:** `retroarch/netplay_optimized.cfg` (sin MITM flag)
- **Handshake:** Lo maneja RA (host ↔ relay ↔ guest). Relay solo pipea bytes.
- **IPC handlers:** `start-mitm-local` (spawn host → waitForPort → spawn relay → spawn guest), `stop-mitm-local`
- **Limpieza:** `mitmRelayProcess` tracked, matado en `before-quit`
- Sin proxy, sin forwarder de bore. Relay es un pipe TCP bidireccional.

## Arquitectura de Proxy/Forwarder

### Proxy TCP (guest side, para bore)
- `startProxy(targetHost, targetPort)` → escucha en `127.0.0.1:55435`
- Pipe bidireccional: guest RA ↔ bore.pub
- TCP_NODELAY en ambos sockets
- Limpieza: `proxyServers[]` → `stopAllProxies()` al cerrar GUEST RA

### Forwarder TCP (host side, para bore)
- `startPortForwarder(listenPort, targetPort)` → escucha en `127.0.0.1:55436`
- Conecta al host RA vía `getLanIp():55435` (LAN IP, no loopback)
- Evita conflicto con proxy en 127.0.0.1:55435
- Pipe bidireccional: bore ↔ host RA
- TCP_NODELAY en ambos sockets
- Limpieza: `forwarderServers[]` → `stopAllForwarders()` al cerrar HOST RA

### Transparent Relay (local test, sin bore)
- `mitm-relay.js` actual: ~60 líneas, forwarder TCP puro
- Sin lógica de protocolo netplay. Solo pipea bytes.
- Escucha en 55436 → forwardea a 127.0.0.1:55435
- Cada conexión entrante crea un pipe bidireccional

### getLanIp()
- Busca primera IPv4 no-interna en `os.networkInterfaces()`
- Fallback a `127.0.0.1` si no hay LAN

## Hallazgos Técnicos

### `--port` ignorado por RetroArch
- **Modo host:** `--host --port 55436` → escucha en 55435 (default), no 55436
- **Modo cliente:** `--connect host --port 9999` → conecta a puerto 55435, no 9999
- `netplay_port` en config también ignorado vía `--appendconfig`
- **Conclusión:** No se puede cambiar el puerto de netplay. Siempre 55435.

### Conflicto de puerto en misma PC para modo bore
- Host RA y guest proxy no pueden compartir 127.0.0.1:55435
- Solución: forwarder conecta al host RA vía LAN IP (no loopback)
- Esto evita que la conexión del forwarder caiga en el proxy

### MITM Relay no funciona sin estado de juego
- El relay MITM (ambos --connect) no puede responder REQ_SAVE
- El master (--connect) se timeoutea ~2s después de SYNC
- Solución: un RA usa --host (tiene el estado), el relay es solo un forwarder TCP
- Lección: el relay MITM necesita ser el host del juego (tener estado de emulación)

## Archivos Clave
- `client/src/main/index.ts` — Todo el backend Electron: IPC, proxy, forwarder, spawns
- `client/src/App.tsx` — UI React: botones Host/JOIN/Directo, lógica relay file
- `client/src/preload/index.ts` — Exposición IPC vía contextBridge
- `client/src/context/ChallengeContext.tsx` — Flujo de retos vía Nakama
- `client/test_stable_flows.js` — 35 tests automatizados (npm run test:stable)
- `relay-server/active_relay.txt` — Archivo compartido entre ventanas
- `relay-server/bore.exe` — Binario del túnel TCP
- `relay-server/mitm-relay.js` — Forwarder TCP transparente (~60 líneas)
- `retroarch/netplay_optimized.cfg` — Config anti-lag con tolerancia a túneles
- `retroarch/netplay_mitm.cfg` — Obsoleto, referencia histórica del intento MITM
- `logs/main_process.log` — Log completo del main process con timestamps
- `AGENTS.md` — §§14-15: política de modularización y flujos blindados
- `Logs/` — Registro de cambios cronológico
- `DOCUMENTACION/05-MITM-to-Transparent-Relay/` — Documentación completa del componente
- `DOCUMENTACION/07-Integracion-Tailscale/` — Documentación del componente Tailscale
- `client/src/components/ui/NetplayConfigModal.tsx` — Editor visual de config netplay (módulo 13)
- `DOCUMENTACION/13-Netplay-Config-Editor/` — Documentación del componente editor netplay

## Problemas Conocidos

### ❌ Inputs duplicados del guest en host — RESUELTO (16-Jul-2026)
- **Síntoma:** Guest presiona flecha una vez, host ve movimiento x2. Fast-forward (espacio) lo corregía temporalmente. Personaje se paraba solo al mantener agachado.
- **Causa raíz:** `run_ahead_enabled = "true"` (predicción duplicaba inputs) + `check_frames > 0` (rollback interrumpía inputs sostenidos) + buffer=1 sin range.
- **Solución final:** `run_ahead_enabled = "false"` + `netplay_input_latency_frames_min = "1"` + `range = "1"` (buffer dinámico 1-2) + `check_frames = "0"` en `retroarch/netplay_optimized.cfg`.
- **Excepción conocida:** Mínimo doble visual en select de personajes en host (imperceptible, no afecta).
- **Verificado:** ✅ Jugabilidad excelente, sin parpadeo, sin desync. Config definitiva test [6].

### ⚠️ Nakama se cae inesperadamente — MITIGADO (16-Jul-2026)
- **Síntoma:** Nakama.exe se detenía sin motivo, dejando la app sin servidor.
- **Solución:** Auto-restart en crash + health check cada 30s con máx 5 reintentos.
- **Código:** `client/src/main/index.ts` — `launchNakama()` + `startNakamaHealthCheck()`

### ❌ P2P Propio — Conexión entre PCs no funciona (24-Jul-2026)
- **Síntoma 1 (Host=PC1, Guest=PC2):** PC2 timeout esperando confirmación del host.
- **Síntoma 2 (Host=PC2, Guest=PC1):** PC1 abre RetroArch pero muestra "error al iniciar juego en red".
- **Causas identificadas y corregidas:**
  1. `doHolePunch` siempre fallaba porque nadie respondía PUNCH → PUNCH_ACK. Fix: `handlePacket` en `P2PManager.ts` ahora responde automáticamente.
  2. Forwarder intentaba bind a 55435 siempre; si ocupado → error fatal. Fix: fallback a puerto aleatorio + `--port` a RetroArch.
  3. Guest lanzaba RetroArch antes de que el host registrara el relay. Fix: espera `connection_confirmed` de Nakama.
  4. `manager.status === "lan_connected"` nunca se cumplía porque el estado real es `"lan_check"`. Fix: comparar con `"lan_check"`.
  5. `privateIps[0]` podía ser IP de Tailscale (100.x.x.x) en vez de LAN real. Fix: `anySameSubnet()` + priorizar IP que NO sea 100.x.x.x.
  6. Forwarder en modo LAN enviaba RELAY_DATA que RetroArch no entiende. Fix: en modo LAN, saltar forwarder y conectar directo.
- **Pendiente de probar:** commit `d2e7986` con todas las correcciones.

### ⚠️ Tiriteo en check_frames > 0 en AMBAS PCs (18-Jul-2026)
- **Síntoma:** Con `check_frames > 0`, los inputs direccionales se
  interrumpen rítmicamente (check_frames/60 segundos). El personaje
  se agacha/se para, frena/acelera. Ocurre en TODOS los inputs (← → ↓).
- **Causa:** El check sync de RetroArch congela momentáneamente el sistema
  de inputs. NO es bug de Emu Latam.
- **Ambas PCs afectadas:** El Ryzen 7 lo muestra muy notorio (rítmico,
  predecible). El Athlon X2 lo muestra casi imperceptible (esporádico).
- **Solución práctica:** `check_frames=0` elimina el tiriteo por completo
  (test [6]). Alternativamente, usar la Athlon como host minimiza el
  tiriteo percibido por el usuario en el Ryzen.
- **Documentación:** Ver tests [4]-[9] en `DOCUMENTACION/12-Test-Latencia-Buffer/plan-actual/04-Codigo.md`.
