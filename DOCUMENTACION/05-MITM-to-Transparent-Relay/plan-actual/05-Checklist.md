# 05 - Checklist - Transparent Relay Fix (Plan Actual)

## Completado
- [x] Rewrite de `mitm-relay.js`: de MITM state machine (~681 líneas) a forwarder TCP (~60 líneas)
- [x] Host RA usa `--host` (tiene estado real del juego)
- [x] Guest RA usa `--connect` (recibe estado real vía relay)
- [x] Relay escucha en 55436, forwardea a 127.0.0.1:55435
- [x] Pipe TCP bidireccional transparente (sin lógica de protocolo)
- [x] TCP_NODELAY en ambos sockets
- [x] Manejo de errores (ECONNRESET/EPIPE silencioso)
- [x] Limpieza en cierre de conexión
- [x] Handler start-mitm-local actualizado con waitForPort(55435)
- [x] Usa `netplay_optimized.cfg` (sin MITM flag)
- [x] 35/35 tests estables sin regresiones
- [x] Conexión netplay exitosa: ambas ventanas RA se ven

## Pendiente
- [ ] Probar con dos PCs reales (host en una, relay+guest en otra)
- [ ] Evaluar latencia del forwarder vs conexión directa
