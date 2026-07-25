# Log 56: Fix bootstrap UI + nuevo relay TCP↔UDP para GGPO WAN

## Fecha
2026-07-24 23:25:21

## Descripción
Correcciones de UI en bootstrap sala y nuevo sistema de relay TCP↔UDP para habilitar GGPO/RetroArch en modo CONEXIÓN VÍA P2P (bootstrap WAN) a través de un segundo túnel bore.

## Problemas resueltos

### Issues 1-2: UI bugs en bootstrap sala
- `onBack` no reseteaba `bootstrapRoomCode`, `bootstrapBoreUrl`, `bootstrapRoomInput`, `bootstrapStatus`, `bootstrapLoading` → después de volver quedaban estados colgados mostrando COPIAR URL/CÓDIGO
- Guest conectaba exitosamente pero `joinMode` seguía en `"bootstrap"` → el input seguía visible
- `onBack` no llamaba `bootstrap-close` → el proceso bore seguía corriendo en background

**Fix:**
- `onBack` (autenticado): resetea todos los estados bootstrap + llama `bootstrap-close`
- `onBack` (no autenticado): resetea estados bootstrap
- Guest CONECTAR: setea `joinMode(null)` y `setBootstrapRoomInput("")` tras éxito
- Se agregó `useEffect` que sincroniza `window.__BOOTSTRAP_ACTIVE__` con `isBootstrapSala`

### Issues 3-4: GGPO/Retroarch sin data path en bootstrap WAN
El P2P module usa UDP hole-punching que falla entre NATs estrictos en WAN. No había ruta de datos para GGPO/RetroArch a través del túnel bore (solo Nakama).

**Solución:** Nuevo módulo `bootstrapGgpoRelay.ts` que crea un relay TCP↔UDP con un segundo túnel bore:

#### Host side (`handleBootstrapGgpoRelayHost`)
1. Crea socket UDP en `127.0.0.1:relayPort` — GGPO host envía datos aquí
2. Crea servidor TCP en `127.0.0.1:tcpPort` — recibe datos del guest via bore
3. Bridge: datos UDP → TCP clients; datos TCP → `127.0.0.1:6003` (GGPO host)
4. Inicia bore para `tcpPort`: `bore local tcpPort --to bore.pub`

#### Guest side (`handleBootstrapGgpoRelayGuest`)
1. Conecta TCP al bore endpoint del host (`bore.pub:XXXXX`)
2. Crea socket UDP en `forwarderUdpPort` — GGPO guest envía datos aquí
3. Bridge: datos UDP → TCP (al host); datos TCP → `127.0.0.1:6004` (GGPO guest)

#### Flujo de datos
```
GGPO guest (:6004) → UDP → forwarder (:fwdPort) → TCP → bore → TCP host → UDP → relay (:relayPort) → GGPO host (:6003)
```

#### Integración con ChallengeContext
- `ChallengeData` agregó `isBootstrapChallenge?: boolean`
- `selectMethod` setea `isBootstrapChallenge` desde `window.__BOOTSTRAP_ACTIVE__`
- Host ACCEPT: si `isBootstrapChallenge`, llama `bootstrap-ggpo-relay-host` y envía `bootstrapBoreUrl` en `connection_info`
- Guest `connection_info`: detecta `useBootstrapGgpoRelay`, llama `bootstrap-ggpo-relay-guest` antes de `ggpo-launch`
- Host GUEST_READY: limpia relay con `bootstrap-ggpo-relay-close`

## Archivos modificados
- `client/src/App.tsx` — onBack resetea bootstrap, guest flow, useEffect __BOOTSTRAP_ACTIVE__
- `client/src/context/ChallengeContext.tsx` — isBootstrapChallenge, bootstrap relay IPCs en ACCEPT/connection_info/GUEST_READY
- `client/src/main/index.ts` — 3 nuevos IPC handlers (bootstrap-ggpo-relay-host/guest/close), import bootstrapGgpoRelay
- `client/src/main/services/ipcChannels.ts` — 3 nuevos canales BOOTSTRAP_GGPO_RELAY_*
- `client/test_bootstrap.js` — +10 tests (canales, handlers, funciones relay)
- `Logs/ULTIMO_NUMERO.txt` — 55 → 56

## Archivos creados
- `client/src/main/bootstrapGgpoRelay.ts` — relay TCP↔UDP con bore para GGPO WAN

## Tests
- `test_p2p_ggpo.js`: 39/39 (100%)
- `test_ggpo_p2p_wan.js`: 17/17 (100%)
- `test_bootstrap.js`: 45/45 (100%)
- `test_stable_flows.js`: 50/51 (mismo fail preexistente de config tolerante)
- TypeScript: 0 errores
- Build Vite: exitoso

## Commit
`bb2f257` en `main`
