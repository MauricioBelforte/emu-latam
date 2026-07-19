# Plan de Testings - Sistema de Retos

## Pruebas Unitarias (Contexto)

- [x] `initiateChallenge()` cambia estado a `picking_method` y guarda pendingTarget
- [x] `cancelMethodPicker()` vuelve a `idle` sin enviar mensaje
- [x] `selectMethod()` crea ChallengeData con método, envía a Nakama, pasa a `sent`
- [x] `cancelChallenge()` envía `challenge_cancel` y resetea estado
- [x] `acceptChallenge()` cambia a `accepted` y envía `challenge_accept`
- [x] `rejectChallenge()` cambia a `rejected` y auto-resetea tras 2.5s
- [x] Timeout automático a los 30s, resetea a los 3s
- [x] `resetChallenge()` limpia todos los estados y timers
- [x] `sendConnectionInfo()` envía mensaje `challenge_accept_conn` con datos

## Pruebas de Integración (Signaling Nakama)

- [x] Envío de `challenge` desde retador A llega a retado B
- [x] Envío de `challenge_accept` desde B llega a A
- [x] Envío de `challenge_reject` desde B llega a A, muestra "RECHAZADO"
- [x] Envío de `challenge_cancel` desde A llega a B, resetea sin mensaje
- [x] Filtro por `targetId`: B ignora retos dirigidos a otro usuario
- [x] Filtro por `senderId`: A ignora sus propios mensajes
- [x] Reto no se envía si `challengeStatus !== "idle"`

## Flujo Host (al recibir `challenge_accept`)

- [x] `kill-retroarch` se ejecuta antes de cualquier método
- [x] **Tailscale**: invoke `tailscale-host` → envía `tailscaleIp` al guest
- [x] **Bore**: invoke `start-relay-tunnel-v2` con 3 reintentos → guarda URL → launch-game host → envía `boreUrl`
- [x] **LAN**: invoke `launch-game` host directo → envía `lanIp`
- [x] Si `tailscale-host` falla → alerta + reset sin crash
- [x] Si `start-relay-tunnel-v2` falla tras 3 intentos → alerta + reset sin crash
- [x] Si `launch-game` falla → alerta + reset sin crash
- [x] `isLaunchingRef` previene doble ejecución
- [x] Reset automático a los 5s post-conexión

## Flujo Guest (al recibir `challenge_accept_conn`)

- [x] **Tailscale**: invoke `tailscale-guest` con IP recibida
- [x] **Bore**: guarda relay URL → launch-game guest
- [x] **LAN**: launch-game guest con IP directa
- [x] Si método es `tailscale` pero no hay `tailscaleIp` → no crash, solo error console
- [x] Si método es `bore` pero no hay `boreUrl` → no crash, solo error console
- [x] Si método es `lan` pero no hay `lanIp` → no crash, solo error console

## Casos Límite (Edge Cases)

- [x] Retar al propio usuario → bloqueado en Sidebar (no se muestra botón)
- [x] Estado `isBusy` durante reto activo → botón RETAR se deshabilita
- [x] Recibir un reto mientras ya hay un reto activo → se ignora (`challengeStatus !== "idle"`)
- [x] Nakama offline → `sendToLobby` falla con warning, no crash
- [x] Timeout guest → host ve `rejected`? No, host ve timeout. Ambos resetean.
- [x] Guest rechaza → host ve "RECHAZADO" y resetea tras 2.5s
- [x] Host cancela → guest simplemente resetea sin notificación visible

## Pruebas de UI/UX

- [x] MethodPicker muestra los 3 métodos con labels y descripciones
- [x] MethodPicker se puede cancelar (botón CANCELAR)
- [x] Modal "RETO RECIBIDO" muestra nombre del retador, método y timer de 30s
- [x] Modal "ESPERANDO RESPUESTA" muestra nombre del retado y timer
- [x] Modal "PELEA!" aparece al aceptar con mensaje de carga
- [x] Botones ACEPTAR/RECHAZAR/CANCELAR funcionan correctamente
- [x] Timer bar animada de 30s en estados `received` y `sent`
- [x] Todos los modales tienen overlay oscuro y animación slideUp
- [x] Botón cerrar (×) en modales de resultado

## Resultados de Ejecución

- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron
- [ ] Todas las pruebas de UI/UX pasaron

## Fecha de Ejecución: — (ver 07-Resultados-Testings.md)
## Estado: EJECUTADO — Ver resultados detallados en `07-Resultados-Testings.md`
