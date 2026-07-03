# 04 - Código - MITM Relay Node.js (Plan Inicial)

## Archivos Involucrados
- `relay-server/mitm-relay.js` — Relay MITM Node.js (681 líneas original)
- `client/src/main/index.ts` — Handler Electron (start-mitm-local/stop-mitm-local)
- `client/src/App.tsx` — Botón TEST MITM LOCAL en UI
- `retroarch/netplay_mitm.cfg` — Config con `netplay_use_mitm_server = "true"`

## Funciones Clave (mitm-relay.js)
- `MitmRelay.start()` — TCP server, lazy assignment master/guest
- `process(socket, buf)` — State machine: MITM_ID → HEADER → POST_HEADER → SEND_NICK → RECV_NICK → SEND_INFO → RECV_INFO → SEND_SYNC → READY
- `processCommand(socket, num, data)` — Manejo de comandos post-handshake
- `buildMode(clientNum, isTarget)` — Construye paquete CMD_MODE
- `sendSync(socket, num)` — Construye y envía CMD_SYNC
- `flushPendingQueue(target)` — Vacía buffer de comandos pendientes

## Problemas Conocidos
- RA no envía RATS (netplay_use_mitm_server = "true" ignorado o versión incompatible)
- Master se desconecta ~2s después de SYNC por timeout de REQ_SAVE
- Relay no tiene estado de juego, no puede responder LOAD_SAVE real
- Intentos de solución: LOAD_SAVE vacío (frame 0, size 0), NAK, MODE broadcast, drop silencioso
- Ninguna solución funciona porque el relay carece del estado de emulación
