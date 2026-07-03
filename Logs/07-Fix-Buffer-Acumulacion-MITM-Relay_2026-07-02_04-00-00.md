# Log 07: Fix de Buffer Acumulación en MITM Relay

**Fecha:** 2026-07-02 04:00
**Archivo modificado:** `relay-server/mitm-relay.js`

## Problema

El relay MITM no completaba el handshake (NICK → INFO → SYNC). El log mostraba "Sent NICK" pero nunca "Received NICK" o "Sent INFO". El test recibía solo 64 bytes (header echo + NICK), sin INFO ni SYNC.

## Causa Raíz

La función `process(socket, buf)` modificaba su parámetro local `buf` mediante `buf = remaining;` y `buf = Buffer.alloc(0);`, pero estos cambios **nunca afectaban** la variable `buf` del closure del data handler (`socket.on("data", ...)`).

Esto provocaba que el buffer externo acumulara TODOS los datos de cada `data` event sin truncarse. En el 2do `data` event:
- `buf = Buffer.concat([buf_viejo_con_header, NICK_nuevo])` = header (24 bytes) + NICK (40 bytes)
- `process()` volvía a empezar con `consumed = 0` y `state = ST_SEND_NICK`
- ST_SEND_NICK no consume datos → consumed sigue 0
- ST_RECV_NICK lee `readBE32(remaining, 0)` donde `remaining = buf.slice(0)` = header bytes → obtiene `NETPLAY_MAGIC (0x52414E50)` en vez de `CMD_NICK (0x0020)`
- Como no es CMD_NICK, el nick nunca se procesa

## Solución Aplicada

Cambio de arquitectura en 3 partes:

### 1. `process()` ahora retorna el buffer remanente
- Todos los `buf = remaining; return;` → `return remaining;`
- `buf = Buffer.alloc(0);` → `return buf.slice(consumed);`

### 2. El data handler usa el retorno
```javascript
// Antes:
this.process(socket, buf);

// Después:
buf = this.process(socket, buf);
```

### 3. ST_SEND_INFO no retorna early
- Cambiado de `return remaining;` a `break;`
- Permite que el while loop continúe inmediatamente a `ST_RECV_INFO` y procese el INFO del cliente en el mismo `data` event

### 4. ST_RECV_INFO guest defer usa `buf.slice(consumed)`
- `return remaining;` → `return buf.slice(consumed);`
- FIX: remaining se captura al inicio del while loop (antes de incrementar consumed)

## Archivos modificados

- `relay-server/mitm-relay.js` (toda la función `process()` y el data handler)
- `relay-server/test-handshake.js` (actualizado con async/await, timeout 2.5s, veredicto)

## Archivos nuevos
- `relay-server/test-handshake-integrated.js` (test que embebe el relay en el mismo proceso)

## Verificación

- `npm run test:stable` → 35/35 tests pasan (locked flows intactos)
- Test integrado: Master y Guest reciben header echo + NICK + INFO + SYNC ✅
- Master: 380 bytes, Guest: 340 bytes
