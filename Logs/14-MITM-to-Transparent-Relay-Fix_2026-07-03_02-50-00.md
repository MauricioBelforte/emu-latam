# 14 - MITM-to-Transparent-Relay-Fix_2026-07-03_02-50-00.md

## Descripción
Se reemplazó el relay MITM Node.js (máquina de estados de handshake netplay) por un forwarder TCP transparente. El MITM relay no funcionaba porque no tiene estado de juego y no puede responder REQ_SAVE (el master se timeouteaba ~2s después de SYNC). La solución usa `--host` para un RA (tiene estado real) y el relay solo pipea datos.

## Cambios Realizados

### relay-server/mitm-relay.js
- **Original:** ~681 líneas con state machine completa (MITM_ID → HEADER → POST_HEADER → NICK → INFO → SYNC → READY), manejo de comandos (PLAY/MODE/REQ_SAVE/LOAD_SAVE), pendingQueue, MODE broadcast, supresión INFO/NICK.
- **Nuevo:** ~60 líneas. Forwarder TCP transparente. Escucha en un puerto, por cada conexión entrante connecta al target y pipea datos bidireccionalmente.
- **Args:** `node mitm-relay.js <listenPort> <targetHost> <targetPort>`

### client/src/main/index.ts — Handler start-mitm-local
- **Original:** Spawnea relay en 55435 → espera puerto → lanza ambos RAs con `--connect` + `netplay_mitm.cfg`.
- **Nuevo:** Spawnea host RA con `--host --port 55435` → waitForPort(55435) → spawnea relay en 55436 (forwarder a 127.0.0.1:55435) → spawnea guest RA con `--connect 127.0.0.1:55436`.
- Config: usa `netplay_optimized.cfg` (sin MITM flag).

### Documentación (DOCUMENTACION/)
- Creado componente `05-MITM-to-Transparent-Relay/` con plan-inicial (MITM original) y plan-actual (forwarder).
- Actualizados los 4 archivos *-ACTUAL.md y README.md.

## Resultados
- 35/35 tests estables sin regresiones.
- Conexión netplay exitosa: ambas ventanas RA se conectan y se ven.
- Host RA maneja todo el protocolo (handshake, REQ_SAVE, LOAD_SAVE, frame sync, inputs).
