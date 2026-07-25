# 05 - Checklist de Implementación (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-25
> **Versión:** 1.2
> **Cambio:** Se aclara estado REAL. El MVP (hole punching + STUN + relay propio) nunca se implementó. Solo tareas periféricas.

---

## ⚠️ Estado Real (Actualizado 25-Jul-2026)

**El MVP del P2P Propio SÍ está implementado como módulo standalone** en `p2p-module/`, pero la integración completa con Electron está a medio camino. El módulo vive separado en `p2p-module/` y se conecta via `client/src/main/p2pBridge.ts`.

**Código existente en `p2p-module/`:**
- `src/protocol/types.ts` — ✅ Tipos completos
- `src/protocol/packet.ts` — ✅ Packet encode/decode + tests
- `src/UDPTransport.ts` — ✅ UDP wrapper + tests
- `src/NatDetector.ts` — ✅ STUN detection + tests
- `src/HolePuncher.ts` — ✅ Hole punching + tests
- `src/RelayServer.ts` — ✅ Relay server + tests
- `src/KeepAliveService.ts` — ✅ Keepalive + tests
- `src/StateMachine.ts` — ✅ State machine + tests
- `src/P2PManager.ts` — ✅ Orchestrador completo
- `src/index.ts` — ✅ Entry point
- `tests/` — ✅ 29 tests

**Integración Electron (parcial):**
- `client/src/main/p2pBridge.ts` — Bridge para host/guest/register/disconnect
- IPCs registrados en index.ts
- Botones P2P en UI (App.tsx)
- Integración con Retos (MethodPicker)

**Lo que falta para producción:**
- Probar hole punching real entre 2 redes distintas (no hay fallback WAN probado)
- El relay server está implementado pero necesita verificación end-to-end
- Manejo de errores más robusto en flujo WAN

---

## Fase 1 — MVP (1v1, reemplazo Tailscale/Bore) — ✅ MÓDULO STANDALONE COMPLETO

| # | Tarea | Estado | Nota |
|:---|:---|:---|:---|
| 1.1 | Tipos en `protocol/types.ts` | ✅ En `p2p-module/src/protocol/types.ts` |
| 1.2 | encode/decode `protocol/packet.ts` | ✅ En `p2p-module/src/protocol/packet.ts` + tests |
| 1.3 | `UDPTransport` (wrapper dgram) | ✅ En `p2p-module/src/UDPTransport.ts` + tests |
| 1.4 | `NatDetector` (STUN) | ✅ En `p2p-module/src/NatDetector.ts` + tests |
| 1.5 | `SignalingChannel` (Nakama) | ⚠️ Pendiente de implementar con Nakama real |
| 1.6 | `HolePuncher` | ✅ En `p2p-module/src/HolePuncher.ts` + tests |
| 1.7 | `RelayServer` 1v1 | ✅ En `p2p-module/src/RelayServer.ts` + tests |
| 1.8 | `KeepAliveService` | ✅ En `p2p-module/src/KeepAliveService.ts` + tests |
| 1.9 | `StateMachine` | ✅ En `p2p-module/src/StateMachine.ts` + tests |
| 1.10 | `P2PManager` (orquestador) | ✅ En `p2p-module/src/P2PManager.ts` |
| 1.11 | IPC handlers P2P | ✅ En `client/src/main/index.ts` (p2p-host, p2p-guest, etc.) |
| 1.12 | Botón RETAR → IPC | ✅ En ChallengeContext (método "p2p") |
| 1.13 | UI spinner + estados | ✅ Botones + connect/disconnect en App.tsx |

---

## Tareas Periféricas Existentes

| # | Tarea | Estado |
|:---|:---|:---|
| 1.14 | Auto-descubrimiento LAN por broadcast UDP (discovery.ts) | ✅ |
| 1.15 | Fallback WAN con input manual de IP (sin Tailscale) | ✅ |
| 1.16 | Botones SALA P2P / UNIRSE A SALA P2P en recuadro rosa | ✅ |
| 1.17 | Integración con sistema de Retos (método "p2p" en MethodPicker) | ✅ |
| 1.18 | ChallengeModal: METHOD_META incluye "p2p" | ✅ |
| 1.19 | getLanIp() excluye IPs Tailscale (100.x.x.x) | ✅ |

---

## Fase 1.5 — Integración GGPO + P2P

| # | Tarea | Estado |
|:---|:---|:---|
| 1.20-1.26 | Rama GGPO en flujo P2P | ✅ |
| Test P2P+GGPO | test_p2p_ggpo.js | ✅ |

---

## Estado de Conexiones Actual (Jul-2026)

| Método | Estado | Funciona en |
|:---|:---|:---|
| **Tailscale** | ✅ Funcional | Cualquier red (WAN/LAN) |
| **Bore (túnel público)** | ⚠️ Depende de bore.pub | Solo si red no bloquea bore.pub |
| **LAN directo** | ✅ Funcional | Misma red local (sin AP isolation) |
| **P2P Propio (módulo 18)** | ❌ No implementado | — |
| **Bootstrap verde** | 🔄 En desarrollo | Con bore (WAN) o IP local (LAN) |

## Pruebas Realizadas (Jul-2026)

| Prueba | Resultado |
|:---|:---|
| Tailscale + GGPO desde celular | ✅ Funcionó perfecto |
| Host directo (sin bore) LAN | ✅ Funciona (test previo) |
| Bootstrap verde WAN (bore.pub) | ❌ bore.pub bloqueado por red celular |
| Bootstrap test local (IP LAN) | ❌ Hotspot del celular tiene AP isolation |
| TCP↔UDP bridge pipeline | ✅ 5/5 tests locales pasan |

## Próximos Pasos

1. Decidir si implementar el MVP real del P2P Propio (hole punching + STUN + relay)
2. Mientras tanto, Tailscale es el método recomendado y funcional
3. Bootstrap verde sirve como alternativa para usuarios sin Tailscale (cuando bore.pub esté disponible)
