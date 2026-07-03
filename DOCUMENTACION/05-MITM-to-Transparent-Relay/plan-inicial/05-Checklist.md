# 05 - Checklist - MITM Relay Node.js (Plan Inicial)

## Completado
- [x] Relay TCP escucha en puerto configurable
- [x] Lazy assignment master/guest (evita captura por waitForPort probes)
- [x] Handshake: header echo, post-header, NICK, INFO, SYNC
- [x] Post-handshake: forwarding bidireccional de comandos
- [x] Cola de pendientes (pendingQueue) para comandos enviados antes de ST_READY
- [x] Salt zeroeado en header (evita diálogo de password)
- [x] MODE broadcast al otro peer cuando alguien envía PLAY
- [x] INFO/NICK suprimidos en ST_READY
- [x] LOAD_SAVE vacío como respuesta a REQ_SAVE
- [x] Integración Electron: start-mitm-local/stop-mitm-local
- [x] Botón TEST MITM LOCAL en UI
- [x] 35/35 tests estables sin regresiones
- [x] handler paralelo (no toca flujos blindados AGENTS.md §14-15)

## No Resuelto
- [ ] Master se desconecta ~2s después de SYNC (timeout REQ_SAVE)
- [ ] El relay no tiene estado de juego → no puede responder LOAD_SAVE correctamente
- [ ] Ninguna estrategia (drop/NAK/LOAD_SAVE vacío/MODE broadcast) evita la desconexión
