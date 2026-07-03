# Log 13: Simplificación del MITM relay a forwarding transparente

**Fecha:** 2026-07-02 ~16:00

## Descripción
Se simplificó `processCommand()` en `mitm-relay.js` para que en estado ST_READY todos los comandos se forwardeen transparentemente entre los clientes, sin interceptar PLAY/MODE/INPUT. Esto resuelve el problema donde el guest se desconectaba inmediatamente después de PLAY porque el relay generaba paquetes MODE sintéticos con formato potencialmente incorrecto.

## Cambios

### Original
- `processCommand()` interceptaba CMD_PLAY y generaba paquetes `buildMode()` sintéticos para ambos clientes
- `buildMode()` creaba paquetes MODE con formato v4/v5 manual
- `CMD_INPUT` y `CMD_NOINPUT` tenían manejo especial (generación de NOINPUT sintético)
- `CMD_SPECTATE` tenía manejo especial
- `CMD_REQ_SAVE` y `CMD_LOAD_SAVE` tenían handlers dedicados
- Constantes: CMD_NOINPUT, CMD_SPECTATE, CMD_PLAY, CMD_MODE, CMD_REQ_SAVE, CMD_LOAD_SAVE
- Propiedades: `frameCount`, `infoSentTo`, `spectating`
- Métodos: `buildMode()`, `bothReady()`

### Nuevo
- `processCommand()` forwardea transparentemente TODOS los comandos al otro cliente
- RA clients negocian PLAY/MODE directamente entre sí
- Se eliminaron constantes no usadas: CMD_NOINPUT, CMD_SPECTATE, CMD_PLAY, CMD_MODE, CMD_REQ_SAVE, CMD_LOAD_SAVE
- Se eliminaron propiedades: `frameCount`, `infoSentTo`, `spectating`, `infoSet`
- Se eliminaron métodos: `buildMode()`, `bothReady()`

### Archivos modificados
- `relay-server/mitm-relay.js`: simplificación de processCommand + limpieza de código muerto

### Tests
- `npm run test:stable` → 35/35 ✅
- `test-handshake-integrated.js` → OK (ambos clientes reciben NICK, INFO, SYNC; guest forwardea su INFO transparentemente)

### Estado actual
El relay:
1. MITM pre-handshake (RATS/RATL) → ST_HEADER
2. Header echo (salt zeroed) → ST_POST_HEADER
3. Post-header echo → ST_SEND_NICK
4. Server NICK "NICK" → ST_RECV_NICK
5. Forward client NICK → ST_SEND_INFO
6. Send empty INFO (master) o master INFO + SYNC (guest) → ST_READY
7. Forwarding transparente de todo comando
