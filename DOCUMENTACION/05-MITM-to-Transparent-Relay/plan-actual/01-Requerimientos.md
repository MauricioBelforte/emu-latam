# 01 - Requerimientos - Transparent Relay Fix (Plan Actual)

## Problema Resuelto
- El MITM relay Node.js no podía responder REQ_SAVE porque no tiene estado de juego.
- Master RA (--connect) se desconectaba ~2s después de SYNC por timeout.
- Intentos fallidos: LOAD_SAVE vacío, NAK, MODE broadcast, drop silencioso, pendingQueue.

## Objetivo Alcanzado
Reemplazar el relay MITM por un forwarder TCP transparente donde:
- El primer RA usa `--host` (tiene el estado del juego)
- El relay es un TCP proxy puro que solo pipea datos
- El guest RA usa `--connect` y recibe el estado real del host
- El host maneja todo: handshake, REQ_SAVE, LOAD_SAVE, frame sync, inputs

## Solución
- `relay-server/mitm-relay.js` rewrite: de ~681 líneas MITM state machine → ~60 líneas forwarder TCP
- Host RA: `--host --port 55435` (escucha, tiene estado del juego)
- Relay: escucha en 55436, forwardea a `127.0.0.1:55435` (piping TCP)
- Guest RA: `--connect 127.0.0.1 --port 55436` (conecta al relay)
- Config: usa `netplay_optimized.cfg` (sin `netplay_use_mitm_server = "true"`)
