# Log 47 — Fix Descubrimiento GGPO: Nakama Storage → Lobby Messages

**Fecha:** 2026-07-21

## Problema
`findActiveGgpoRooms()` siempre devolvía 0 salas aunque el host hubiera publicado una. El guest no veía salas disponibles para unirse.

## Diagnóstico
- `fetchGgpoRoom()` usaba `readStorageObjects()` con `user_id` del host
- `user_id` es el campo correcto según `ApiReadStorageObjectId` de Nakama JS SDK
- Sin embargo, `readStorageObjects` con `user_id` de terceros nunca devolvía objetos (posible restricción server-side o bug del SDK)
- `deleteStorageObjects()` también tenía `user_id` incorrecto (no existe en `ApiDeleteStorageObjectId`)
- Las funciones Storage sí funcionaban para OWN storage (el host podía publicar OK), pero no para cross-user reads

## Solución
Reemplazar Nakama Storage por lobby messages (chat) para descubrimiento de salas GGPO, usando el mismo mecanismo que ChallengeContext.

### Cambios

**GgpoContext.tsx** — Reescribir usando 3 tipos de mensajes:
- `ggpo_room_open` — host anuncia sala (hostIp, hostPort, hostName, method, timestamp)
- `ggpo_room_close` — host cancela sala
- `ggpo_guest_join` — guest notifica al host (targetHostId, guestIp, guestPort)

Flujo host:
1. `startHosting()` → envía `ggpo_room_open` → status = "waiting_guest"
2. Espera evento `ggpo_guest_join` con `targetHostId === userId` → lanza GGPO player 0
3. `cancelHosting()` → envía `ggpo_room_close` → mata procesos

Flujo guest:
1. Listener recibe `ggpo_room_open` → agrega a `discoveredRooms`
2. Listener recibe `ggpo_room_close` → remueve de `discoveredRooms`
3. `joinRoom()` → lanza GGPO player 1 → envía `ggpo_guest_join`

Cambios adicionales:
- Eliminado polling a Storage (findActiveGgpoRooms/findGuestRoomsForHost)
- Eliminada dependencia de `onlineUsers` de SocialContext
- Usa refs (`userIdRef`, `channelIdRef`, `usernameRef`, `statusRef`) para evitar closures stale
- Cleanup periódico de salas viejas (> 15s sin mensaje)

**ggpoNet.ts** — Limpiado:
- Funciones Storage preservadas pero no usadas en flujo principal
- `deleteGgpoRoom()` corregido: eliminado `user_id` (no existe en `ApiDeleteStorageObjectId`)
- `findGuestRoomsForHost` preservado (dead code, no se importa)

**index.ts** (barrel) — Limpiado:
- Eliminado `updateGgpoRoom` obsoleto de export

## Archivos modificados
- `client/src/ggpo/context/GgpoContext.tsx` — Reescribir
- `client/src/ggpo/lib/ggpoNet.ts` — Limpiar
- `client/src/ggpo/index.ts` — Eliminar export muerto
- `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` — Agregar §14.10

## Build
`npm run build` → OK sin errores
