# Log de Cambios - Integración GGPO con Retos + Fix Flujo Manual + Documentación

**Fecha:** 2026-07-21 04:38:38
**Número:** 45
**Descripción:** Integración del toggle GGPO con el sistema de retos, fix del flujo manual de unión (GgpoGuestView), y actualización completa de la documentación del módulo 14

## Cambios Realizados

### 1. Integración GGPO con Retos (ChallengeContext.tsx)

**Problema:** El toggle GGPO solo afectaba a la UI manual, pero los retos (challenges) siempre lanzaban RetroArch sin importar el engine seleccionado.

**Solución:**
- `main.tsx`: Reorden de providers — `GgpoProvider` ahora envuelve a `ChallengeProvider`
- `ChallengeContext.tsx`: Importa `useGgpo()` para leer `engine`
- **Host** (acepta reto con engine === "ggpo"):
  - Detecta IP según método (get-tailscale-ip o get-lan-ip)
  - Envía `ggpoHostIp` y `useGgpo: true` via `sendConnectionInfo`
  - **NO lanza GGPO inmediatamente** (espera guest_ready)
- **Guest** (recibe _conn con useGgpo):
  - Lee `ggpoHostIp` del mensaje
  - Detecta IP propia
  - Lanza `ggpo-launch` como player 1 con IP del host
  - Envía `CHALLENGE_GUEST_READY_MSG_TYPE` con `{ guestIp }`
- **Host** recibe guest_ready → lanza `ggpo-launch` como player 0 con guestIp
- Bore se rechaza explícitamente en GGPO con alert

**Nuevo tipo de mensaje:**
```typescript
const CHALLENGE_GUEST_READY_MSG_TYPE = "challenge_guest_ready"
```

### 2. Fix Flujo Manual (GgpoGuestView)

**Problema:** `joinRoom()` llamaba a `updateGgpoRoom()` que intentaba leer y escribir Storage del HOST usando el USER ID del GUEST. Como `permission_write=1` (solo owner), la escritura fallaba.

**Solución:**
- `updateGgpoRoom()` eliminado de `ggpoNet.ts` (no se usa más)
- `joinRoom()` ahora:
  1. Lee IP del host desde `room` (parámetro recibido)
  2. Obtiene IP propia via `get-lan-ip`
  3. Lanza GGPO como guest (player 1)
  4. **Publica su PROPIA sala** con `{ status: "joining", targetHostId: hostUserId, hostIp: guestIp }`
- `findGuestRoomsForHost(hostUserId, onlineUserIds)` — nueva función que busca salas con `status === "joining"` y `targetHostId === hostUserId`
- Host polling cambia de `fetchGgpoRoom(userId)` (leía su propia sala) a `findGuestRoomsForHost()` (busca salas de guests)
- `GgpoRoom.status` cambia de `"ready"` a `"joining"`, se agrega campo `targetHostId`

### 3. Fix de Closures Stale

**Problema:** Los intervalos de polling en `GgpoContext` capturaban `onlineUsers` en el closure, dando siempre el valor inicial.

**Solución:**
```typescript
const onlineUsersRef = useRef<...>([])
onlineUsersRef.current = onlineUsers  // siempre fresco
```
Todos los polling ahora usan `onlineUsersRef.current` en vez de `onlineUsers` directamente.

### 4. Documentación Actualizada

- `DOCUMENTACION/14-Integracion-FBNeo-GGPO/plan-actual/01-Requerimientos.md` — reescrito con estado real
- `DOCUMENTACION/14-Integracion-FBNeo-GGPO/plan-actual/03-Diseno.md` — reescrito con flujos reales
- `DOCUMENTACION/14-Integracion-FBNeo-GGPO/plan-actual/04-Codigo.md` — reescrito con archivos, funciones, estructura exacta
- `DOCUMENTACION/14-Integracion-FBNeo-GGPO/plan-actual/05-Checklist.md` — actualizado con todo completado + pendientes
- `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` — agregadas secciones 14.8 y 14.9

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `client/src/context/ChallengeContext.tsx` | Importa useGgpo, guest_ready message, host espera antes de lanzar |
| `client/src/main.tsx` | GgpoProvider envuelve a ChallengeProvider |
| `client/src/ggpo/context/GgpoContext.tsx` | onlineUsersRef, joinRoom publica sala propia, host usa findGuestRoomsForHost |
| `client/src/ggpo/lib/ggpoNet.ts` | Eliminado updateGgpoRoom, agregado findGuestRoomsForHost, campo targetHostId |
| `DOCUMENTACION/14-Integracion-FBNeo-GGPO/plan-actual/01-Requerimientos.md` | Reescrito |
| `DOCUMENTACION/14-Integracion-FBNeo-GGPO/plan-actual/03-Diseno.md` | Reescrito |
| `DOCUMENTACION/14-Integracion-FBNeo-GGPO/plan-actual/04-Codigo.md` | Reescrito |
| `DOCUMENTACION/14-Integracion-FBNeo-GGPO/plan-actual/05-Checklist.md` | Actualizado |
| `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` | Agregadas secciones 14.8 y 14.9 |
| `Logs/45-...` | Este archivo |
| `Logs/ULTIMO_NUMERO.txt` | Actualizado a 45 |

## Próximos Pasos
- Tests automatizados para findGuestRoomsForHost y joinRoom
- Timeout explícito si guest no aparece en 30s en GgpoContext
- Soporte para roms seleccionables (actualmente hardcodeado "kof98")

## Commits Asociados
- 252786f — "Se integró el toggle GGPO con el sistema de retos"
- af848e8 — "Se corrigió el flujo de retos GGPO: host espera guest_ready"
- 46e88d0 — "Se corrigió el flujo manual de GGPO: guest publica su propia sala"
