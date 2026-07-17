# Plan de Testings - MITM-to-Transparent-Relay

## Pruebas de Script (mitm-relay.js)
- [x] `mitm-relay.js` existe
- [x] Script tiene < 100 líneas (forwarder simple vs ~681 del MITM)
- [x] Usa `net.createServer`
- [x] Usa `setNoDelay(true)` en ambos sockets
- [x] Usa `incoming.pipe(target)` y `target.pipe(incoming)`
- [x] Maneja `ECONNRESET` silenciosamente
- [x] Maneja `EPIPE` silenciosamente
- [x] Escucha en `0.0.0.0` (todas las interfaces)
- [x] Soporta `SIGINT` para cierre graceful
- [x] Soporta `SIGTERM` para cierre graceful
- [x] NO contiene state machine MITM original
- [x] Lee `RELAY_PORT` de `process.argv[2]`
- [x] Lee `TARGET_HOST` de `process.argv[3]`
- [x] Lee `TARGET_PORT` de `process.argv[4]`
- [x] `RELAY_PORT` default = 55435
- [x] `TARGET_HOST` default = `127.0.0.1`
- [x] `TARGET_PORT` default = 55436

## Pruebas de Forwarder TCP
- [x] Pipe bidireccional: datos entrantes se reenvían al target
- [x] Pipe bidireccional: datos del target se reenvían al cliente
- [x] 5 clientes conectan al forwarder simultáneamente
- [x] 5 clientes reciben mirror correctamente
- [x] Target socket se cierra cuando incoming se cierra (close → destroy peer)
- [x] Forwarder escucha en `0.0.0.0` (todas las interfaces)

## Pruebas de Spawn Args (start-mitm-local)
- [x] Host args contienen `--host`
- [x] Host args contienen `--port 55435`
- [x] Host args NO contienen `--connect`
- [x] Host args contienen `--appendconfig` (si cfg existe)
- [x] Guest args contienen `--connect 127.0.0.1`
- [x] Guest args contienen `--port 55436`
- [x] Guest args NO contienen `--host`
- [x] Guest args contienen `--appendconfig` (si cfg existe)
- [x] Relay args: script path como primer argumento
- [x] Relay args: puerto 55436 como RELAY_PORT
- [x] Relay args: `127.0.0.1` como TARGET_HOST
- [x] Relay args: 55435 como TARGET_PORT
- [x] Relay args tiene exactamente 4 argumentos

## Pruebas de Spawn Real (child_process)
- [x] `mitm-relay.js` se inicia como proceso hijo correctamente
- [x] Relay imprime logs de inicio con puerto y target
- [x] Datos viajan a través del relay spawn (RELAY:VIA_RELAY)
- [x] Relay responde correctamente a datos del cliente

## Pruebas de Concurrencia (mitmRunning flag)
- [x] Primera llamada a start-mitm-local → success=true
- [x] Segunda llamada con mitmRunning=true → error específico

## Pruebas de Manejo de Errores
- [x] Sin `mitm-relay.js` → error específico
- [x] Sin `retroarch.exe` → error específico
- [x] Ambos archivos existen → success

## Pruebas de Comparación (MITM vs Transparent)
- [x] `mitm-relay.js` tiene < 100 líneas (vs ~681 del MITM original)
- [x] No tiene lógica de handshake netplay (NICK, INFO, SYNC)
- [x] No tiene lógica de savestate (REQ_SAVE, LOAD_SAVE)
- [x] No tiene estados complejos (pendingQueue, state =)
- [x] No tiene lógica de frames (frame, input)
- [x] Solo hace pipe TCP (pipe bidireccional simple)

## Pruebas de Parseo de Argumentos
- [x] Sin args → RELAY_PORT default 55435
- [x] Sin args → TARGET_HOST default 127.0.0.1
- [x] Sin args → TARGET_PORT default 55436
- [x] Args custom → RELAY_PORT = 55555
- [x] Args custom → TARGET_HOST = 192.168.1.100
- [x] Args custom → TARGET_PORT = 55435
- [x] Solo RELAY_PORT → default TARGET_HOST
- [x] Solo RELAY_PORT → default TARGET_PORT

## Pruebas de Puertos
- [x] Host RA escucha en 55435
- [x] Relay escucha en 55436
- [x] Guest RA conecta a relay en 55436
- [x] Relay forwardea a host en 55435
- [x] Host port ≠ Relay port (55435 ≠ 55436)
- [x] Guest conecta al relay, no directo al host

## Pruebas de Latencia (estimadas)
- [ ] Latencia del forwarder TCP < 5ms (requiere instrumentación)
- [ ] Throughput del forwarder suficiente para netplay (requiere benchmark)

## Pruebas Funcionales (requieren RetroArch)
- [ ] Flujo completo host → relay → guest con RetroArch
- [ ] Host responde REQ_SAVE con estado real de juego
- [ ] No hay desconexión por timeout
- [ ] Frame sync funciona correctamente
- [ ] Inputs del guest se ven correctos en el host

## Resultados de Ejecución
- [x] 62/62 tests automatizados pasan (sin RetroArch)
- [ ] Pruebas funcionales con RetroArch pendientes
- [ ] Pruebas de latencia con instrumentación pendientes

## Fecha de Ejecución: 2026-07-17
## Estado: COMPLETADO (tests automatizados) — 62/62 tests pasan (✅ 100%)
## Pendiente: Pruebas funcionales con RetroArch + benchmarks de latencia
