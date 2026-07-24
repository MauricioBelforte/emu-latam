# Log 51 — Fix flujo P2P Challenge (host no lanzaba RA en LAN) + documentación (24-Jul-2026)

## Cambios Realizados

### 1. Fix: host no lanzaba RetroArch en modo LAN
**Archivo:** `client/src/context/ChallengeContext.tsx`

**Problema:** En el handler `CHALLENGE_ACCEPT_MSG_TYPE` para método P2P, el código chequeaba `if (guestCandidate)` antes de lanzar RA. En modo LAN, el guest enviaba el accept sin `guestCandidate`, por lo que el host no ejecutaba nada (ni `launch-game`, ni registro del guest). El retador nunca veía RetroArch.

**Fix:** Se movió `launch-game` fuera del `if (guestCandidate)`. El host AHORA siempre lanza RA como host. El registro del guest (`p2p-host-register-guest`) + `connection_confirmed` solo ocurre si hay candidate (WAN/modo relay).

### 2. Fix: guest LAN no esperaba a que el host esté listo
**Archivo:** `client/src/context/ChallengeContext.tsx`

**Problema:** En `acceptChallenge`, modo LAN, el guest llamaba `launch-game` inmediatamente después de `sendToLobby`, sin dar tiempo al host para recibir el mensaje y lanzar RA. RetroArch del guest se conectaba antes de que el host estuviera escuchando.

**Fix:** Se agregó `await new Promise(r => setTimeout(r, 2000))` entre `sendToLobby` y `launch-game` del guest.

### 3. Fix: back button no limpiaba todos los estados
**Archivo:** `client/src/App.tsx`

**Problema:** Al presionar "VOLVER" estando autenticado (hosting), `logout()` se llamaba pero no se reseteaban `joinMode`, `nakamaHost`, `nakamaPort`, `discoveryDoneRef`, `p2pDiscoveryRef`. Esto causaba que al presionar UNIRSE A SALA después, los valores stale interfirieran.

**Fix:** Se agregaron `setJoinMode(null)`, `setNakamaHost("127.0.0.1")`, `setNakamaPort("7350")`, `discoveryDoneRef.current = false`, `p2pDiscoveryRef.current = false` en el onBack.

### 4. Fix: METHOD_META sin entrada "p2p" (commit anterior)
**Archivo:** `client/src/components/ui/ChallengeModal.tsx`

**Problema:** El modal de reto crasheaba con `Cannot read properties of undefined (reading 'accent')` al recibir un reto con método "p2p".

**Fix:** Se agregó `p2p: { label: "P2P Automático", accent: "#f0f" }` a METHOD_META.

### 5. Fix: getLanIp() retornaba IP de Tailscale
**Archivo:** `client/src/main/index.ts`

**Problema:** `getLanIp()` retornaba la primera IP no-interna, que en PCs con Tailscale era 100.x.x.x. El broadcast UDP enviaba esa IP y el guest no podía conectar.

**Fix:** Ahora itera todas las interfaces, salta IPs que empiezan con `100.`, prioriza IP LAN real (192.168.x.x, 10.x.x.x, 172.16-31.x.x).

## Test Results
- `p2p-module`: 29/29 tests ✅
- `tsc --noEmit`: 0 errores ✅

## Commits de Hoy
| Commit | Descripción |
|--------|-------------|
| `0a7ea73` | Fix getLanIp() excluye Tailscale |
| `6c87396` | METHOD_META agrega "p2p" |
| `8ec0fa7` | Documentación actualizada |
| `bfca9c3` | Fix ChallengeContext: guest usa IP real, host publica connection_confirmed |
| `940bacf` | Fix back button resetea todos los estados |
| `ba9de7f` | Fix host siempre lanza RA en P2P, guest espera 2s |

## Estado Actual
- ✅ P2P automático funciona entre PCs en LAN
- ✅ Retos con método P2P: ambos abren RetroArch y conectan
- ✅ Botón VOLVER limpia todos los estados correctamente
- ⏳ Pendiente: probar P2P entre PCs en WAN (hole punching/relay)
