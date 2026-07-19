# Plan de Testings - Sistema de Retos (Plan Inicial)

## Pruebas Unitarias

- [ ] `initiateChallenge()` cambia estado a `picking_method`
- [ ] `selectMethod()` envía mensaje Nakama con método incluido
- [ ] `acceptChallenge()` envía `challenge_accept` al retador
- [ ] `rejectChallenge()` envía `challenge_reject` y resetea
- [ ] Timeout 30s resetea automaticamente
- [ ] `resetChallenge()` limpia todos los estados

## Pruebas de Integración

- [ ] Mensaje `challenge` llega al retado via Nakama
- [ ] Mensaje `challenge_accept` llega al retador y dispara conexión
- [ ] Rechazo/cancelación se propaga correctamente
- [ ] Filtro por `targetId` funciona (no recibir retos ajenos)

## Casos Límite

- [ ] Retar al propio usuario
- [ ] Recibir reto mientras ya hay uno activo
- [ ] Nakama offline durante el reto
- [ ] Guest tarda más de 30s en responder

## Manejo de Errores

- [ ] Error en tailscale-host
- [ ] Error en start-relay-tunnel-v2 (3 reintentos)
- [ ] Error en launch-game

## Resultados de Ejecución

- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron
- [ ] Todos los manejos de errores pasaron

## Fecha de Ejecución: — (plan inicial, no ejecutado)
## Estado: PENDIENTE — Plan original de testing, no ejecutado en esta etapa
