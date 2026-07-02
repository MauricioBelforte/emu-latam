# Código de Ejecución - Emu Latam

## Para desarrollar y ejecutar localmente
1. Asegurar que PostgreSQL está corriendo (puerto 5433 en PC de Mauricio).
2. Abrir terminal en `client/`.
3. Ejecutar `npm run dev`.
4. Vite levanta React en puerto 5173, Electron abre ventana principal + ventana guest.
5. Nakama se inicia silenciosamente. Al cerrar App, procesos mueren limpiamente.
6. Tests: `npm run test:stable` (35 tests de flujos blindados).

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

## Arquitectura de Proxy/Forwarder

### Proxy TCP (guest side)
- `startProxy(targetHost, targetPort)` → escucha en `127.0.0.1:55435`
- Pipe bidireccional: guest RA ↔ bore.pub
- TCP_NODELAY en ambos sockets
- Limpieza: `proxyServers[]` → `stopAllProxies()` al cerrar GUEST RA

### Forwarder TCP (host side)
- `startPortForwarder(listenPort, targetPort)` → escucha en `127.0.0.1:55436`
- Conecta al host RA vía `getLanIp():55435` (LAN IP, no loopback)
- Evita conflicto con proxy en 127.0.0.1:55435
- Pipe bidireccional: bore ↔ host RA
- TCP_NODELAY en ambos sockets
- Limpieza: `forwarderServers[]` → `stopAllForwarders()` al cerrar HOST RA

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

## Archivos Clave
- `client/src/main/index.ts` — Todo el backend Electron: IPC, proxy, forwarder, spawns
- `client/src/App.tsx` — UI React: botones Host/JOIN/Directo, lógica relay file
- `client/src/preload/index.ts` — Exposición IPC vía contextBridge
- `client/src/context/ChallengeContext.tsx` — Flujo de retos vía Nakama
- `client/test_stable_flows.js` — 35 tests automatizados (npm run test:stable)
- `relay-server/active_relay.txt` — Archivo compartido entre ventanas
- `relay-server/bore.exe` — Binario del túnel TCP
- `retroarch/netplay_optimized.cfg` — Config anti-lag con tolerancia a túneles
- `logs/main_process.log` — Log completo del main process con timestamps
- `AGENTS.md` — §§14-15: política de modularización y flujos blindados
- `Logs/` — Registro de cambios cronológico
