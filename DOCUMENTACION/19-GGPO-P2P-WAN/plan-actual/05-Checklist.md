# 05 - Checklist de Implementación — Relay WAN para GGPO vía P2P

> **Módulo:** 19-GGPO-P2P-WAN
> **Fecha:** 2026-07-24
> **Versión:** 1.0

---

## Fase 1 — Bridge + IPC

| # | Tarea | Complejidad | Archivo | Estado |
|:---|:---|:---|:---|:---|
| 1.1 | Crear `ggpoP2PBridge.ts` con estado global separado | 🟢 Baja | `client/src/main/ggpoP2PBridge.ts` | ✅ |
| 1.2 | Implementar `handleGGPOP2PHost()` | 🟡 Media | `ggpoP2PBridge.ts` | ✅ |
| 1.3 | Implementar `handleGGPOP2PHostRegisterGuest()` con relay local | 🔴 Alta | `ggpoP2PBridge.ts` | ✅ |
| 1.4 | Implementar `handleGGPOP2PGuest()` con auto-detección LAN/WAN | 🔴 Alta | `ggpoP2PBridge.ts` | ✅ |
| 1.5 | Implementar `handleGGPOP2PDisconnect()` con limpieza completa | 🟡 Media | `ggpoP2PBridge.ts` | ✅ |
| 1.6 | Registrar IPC handlers en `index.ts` | 🟢 Baja | `client/src/main/index.ts` | ✅ |
| 1.7 | Agregar canales a `ipcChannels.ts` | 🟢 Baja | `client/src/main/services/ipcChannels.ts` | ✅ |

## Fase 2 — Integración ChallengeContext

| # | Tarea | Complejidad | Archivo | Estado |
|:---|:---|:---|:---|:---|
| 2.1 | Modificar `acceptChallenge()` para usar `ggpo-p2p-guest` si engine==="ggpo" | 🟡 Media | `ChallengeContext.tsx` | ✅ |
| 2.2 | Agregar rama WAN en acceptChallenge (isLan=false → ACCEPT + esperar conn_info) | 🟡 Media | `ChallengeContext.tsx` | ✅ |
| 2.3 | Modificar ACCEPT handler para llamar `ggpo-p2p-register-guest` si engine==="ggpo" y WAN | 🟡 Media | `ChallengeContext.tsx` | ✅ |
| 2.4 | Agregar `ggpoForwarderPortRef` y `ggpoRelayPortRef` para almacenar puertos | 🟢 Baja | `ChallengeContext.tsx` | ✅ |
| 2.5 | Modificar connection_info handler para usar forwarderPort en WAN (useGgpoRelay) | 🟡 Media | `ChallengeContext.tsx` | ✅ |
| 2.6 | Modificar guest_ready handler para usar relayPort en WAN | 🟡 Media | `ChallengeContext.tsx` | ✅ |

## Fase 3 — Testing

| # | Tarea | Complejidad | Archivo | Estado |
|:---|:---|:---|:---|:---|
| 3.1 | Test script: simular flujo WAN completo (2 P2PManagers en mismo proceso) | 🔴 Alta | `test_ggpo_p2p_wan.js` | 🔲 |
| 3.2 | Test: auto-detección LAN vs WAN | 🟡 Media | `test_ggpo_p2p_wan.js` | 🔲 |
| 3.3 | Test: relay reenvía datos entre forwarder y GGPO | 🟡 Media | `test_ggpo_p2p_wan.js` | 🔲 |
| 3.4 | Test: limpieza de recursos en disconnect | 🟡 Media | `test_ggpo_p2p_wan.js` | 🔲 |
| 3.5 | Verificar regresión: `npm run build` sin errores | 🟢 Baja | — | 🔲 |
| 3.6 | Verificar regresión: `node test_stable_flows.js` | 🟢 Baja | — | 🔲 |
| 3.7 | Verificar regresión: `node test_p2p_ggpo.js` (LAN GGPO + P2P) | 🟢 Baja | — | 🔲 |

## Dependencias entre Tareas

```
1.1 (bridge.ts) → 1.2 (host) → 1.3 (register-guest)
               → 1.4 (guest) 
               → 1.5 (disconnect)
1.2 + 1.3 + 1.4 → 1.6 (index.ts) + 1.7 (ipcChannels.ts)
                                         ↓
                                   2.1-2.5 (ChallengeContext.tsx)
                                         ↓
                                   3.1-3.7 (testing)
```
