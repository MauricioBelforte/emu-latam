# Log 53: GGPO+P2P WAN — Implementación y Testeo

## Descripción
Se implementó el componente **19-GGPO-P2P-WAN** que permite que GGPO funcione sobre P2P en redes WAN (entre países) usando relay UDP local + P2P transport en lugar de hole punching directo.

## Archivos creados
- `client/src/main/ggpoP2PBridge.ts` — nuevo bridge con 4 funciones:
  - `handleGGPOP2PHost()`: P2PManager startHost, retorna candidate
  - `handleGGPOP2PHostRegisterGuest()`: registra guest, crea relay socket (127.0.0.1:0 ↔ GGPO host:6003 ↔ P2P)
  - `handleGGPOP2PGuest()`: P2PManager startJoin, auto-detecta LAN/WAN; si WAN crea forwarder (GGPO guest:6004 ↔ P2P)
  - `handleGGPOP2PDisconnect()`: limpia sockets y managers, resetea tokenCounter

## Archivos modificados
- `client/src/main/index.ts` — registro de 4 IPCs: `ggpo-p2p-host`, `ggpo-p2p-guest`, `ggpo-p2p-register-guest`, `ggpo-p2p-disconnect`
- `client/src/main/services/ipcChannels.ts` — whitelist de los 4 canales
- `client/src/context/ChallengeContext.tsx`:
  - `acceptChallenge()` llama `ggpo-p2p-guest` si engine==="ggpo" con ramas LAN/WAN
  - ACCEPT handler llama `ggpo-p2p-register-guest` si guest envió `guestCandidate` (WAN)
  - Agregados `ggpoForwarderPortRef` y `ggpoRelayPortRef` para puertos entre accepts y connection_info
  - connection_info handler: rama WAN (`useGgpoRelay`) usa forwarderPort con `127.0.0.1`
  - guest_ready handler host: rama WAN usa `ggpoRelayPortRef` con `127.0.0.1`

## Archivos de documentación creados
- `DOCUMENTACION/19-GGPO-P2P-WAN/plan-inicial/` — 7 archivos (especificación original)
- `DOCUMENTACION/19-GGPO-P2P-WAN/plan-actual/` — 7 archivos actualizados con resultados de testing

## Tests
- `client/test_ggpo_p2p_wan.js` — 17 tests, 100% éxito
  - Pipeline completo: guest→forwarder→P2P→relay→eco→vuelta
  - Auto-detección LAN/WAN
  - Casos límite (colisión puerto, sin candidate, cleanup, disconnect sin init)
  - Regresión: p2pBridge + GGPO LAN + Tailscale no afectados
- `test_stable_flows.js` — 50/51 (1 pre-existing)
- `test_p2p_ggpo.js` — 39/39 (GGPO LAN existente)
- Build TypeScript sin errores

## Commit
Pendiente de subida a main.
