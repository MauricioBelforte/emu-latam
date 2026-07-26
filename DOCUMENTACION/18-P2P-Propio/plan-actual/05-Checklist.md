# 05 - Checklist de Implementación (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-26
> **Versión:** 1.3
> **Cambio:** Documentación del estado real tras investigación WAN. Bugs encontrados y corregidos. Limitación del router ISP.

---

## ⚠️ Estado Real (Actualizado 26-Jul-2026)

**El MVP del P2P Propio está implementado como módulo standalone** en `p2p-module/`, con integración Electron completa. La conexión LAN funciona perfectamente. La conexión WAN desde internet está **bloqueada a nivel de red** porque el router ISP no aplica el mapping UPnP.

**Estado por componente:**

| Componente | Estado |
|:---|:---|
| `p2p-module/` (29 tests) | ✅ Completos |
| Bridge Electron + IPCs | ✅ Implementados |
| LAN broadcast | ✅ Funcional |
| UPnP (nat-upnp) | ⚠️ Router acepta pero no aplica |
| Windows Firewall (netsh) | ✅ Regla creada (con admin) |
| WAN manual (IP:puerto) | ❌ Bloqueado por router ISP |
| waitForRelayAck | ⚠️ **Bug corregido** (evento incorrecto) |
| UI fucsia (botones) | ✅ Integrada y reordenada |

---

## Fase 1 — MVP (1v1, reemplazo Tailscale/Bore) — ✅ MÓDULO STANDALONE COMPLETO

| # | Tarea | Estado | Nota |
|:---|:---|:---|:---|
| 1.1 | Tipos en `protocol/types.ts` | ✅ En `p2p-module/src/protocol/types.ts` |
| 1.2 | encode/decode `protocol/packet.ts` | ✅ En `p2p-module/src/protocol/packet.ts` + tests |
| 1.3 | `UDPTransport` (wrapper dgram) | ✅ En `p2p-module/src/UDPTransport.ts` + tests |
| 1.4 | `NatDetector` (STUN) | ✅ En `p2p-module/src/NatDetector.ts` + tests |
| 1.5 | `SignalingChannel` (Nakama) | ✅ Implementado con Nakama real |
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

## Tareas WAN Manual (Julio 2026)

| # | Tarea | Estado | Detalle |
|:---|:---|:---|:---|
| WAN-01 | RELAY_REQUEST / RELAY_ACK en protocol/types.ts | ✅ | `PacketType.RELAY_REQUEST = 0x07, RELAY_ACK = 0x08` |
| WAN-02 | P2PManager.handlePacket RELAY_REQUEST + auto-registro | ✅ | Host registra peer y envía RELAY_ACK |
| WAN-03 | `handleP2PGuestWan()` en p2pBridge.ts | ✅ | IP manual → candidate → startJoinWan |
| WAN-04 | UI: host muestra IP pública P2P | ✅ | IP pública + LAN + UPnP status |
| WAN-05 | UI: guest input IP:puerto + CONECTAR | ✅ | Input + botón + VOLVER |
| WAN-06 | UI: WAN no rompe broadcast LAN | ✅ | Código separado |
| WAN-07 | Build sin errores | ✅ | `tsc --noEmit` + `vite build` |
| WAN-08 | Regresión LAN sigue funcionando | ✅ | Broadcast + directo intactos |
| WAN-09 | UPnP automático al crear sala | ✅ | `nat-upnp` con IP LAN real |
| WAN-10 | Windows Firewall automático | ✅ | `netsh` para puerto bound |
| WAN-11 | **waitForRelayAck fix** | ✅ **Corregido** | Evento 'raw-message' vs 'message' |
| WAN-12 | UPnP private port = bound port | ✅ **Corregido** | No usar puerto STUN |
| WAN-13 | UPnP local IP excluye Tailscale | ✅ **Corregido** | No usar 100.x.x.x |
| WAN-14 | Firewall usa puerto bound real | ✅ **Corregido** | No usar puerto STUN |
| WAN-15 | **Test WAN desde celular** | ❌ **Falla** | Router ISP no aplica UPnP |
| WAN-16 | UI reorder (Tailscale → Bootstrap → P2P fucsia) | ✅ | commit db64d6b |

---

## Bugs encontrados y Corregidos

| Bug | Síntoma | Archivo | Fix | Commit |
|:---|:---|:---|:---|:---:|
| UPnP local IP = Tailscale | Router reenviaba a 100.x.x.x no existente | `upnp.ts`, `p2pBridge.ts` | Filtrar IPs 100.x.x.x | 9c64b80 |
| UPnP private port = STUN | Router reenviaba a puerto no escuchado | `upnp.ts`, `p2pBridge.ts` | Usar `transport.port` como private | 089d698 |
| **waitForRelayAck evento** | **RELAY_ACK siempre timeout** | **`P2PManager.ts:382`** | **'raw-message' no 'message'** | **8a8b177** |
| Firewall regla puerto STUN | Firewall no permitía puerto bound real | `p2pBridge.ts:99` | Usar `localPort` | 089d698 |

---

## Estado de Conexiones Actual (Jul-2026)

| Método | Estado | Funciona en |
|:---|:---|:---|
| **Tailscale** | ✅ Funcional | Cualquier red (WAN/LAN) |
| **P2P Propio LAN** (broadcast) | ✅ Funcional | Misma red local |
| **P2P Propio WAN** (IP manual) | ❌ No funciona | Router ISP ignora UPnP |
| **Bore (túnel público)** | ⚠️ Depende de bore.pub | Solo si red no bloquea bore.pub |
| **Bootstrap verde** (Sala Pública) | ✅ Funcional | Con bore o IP local |
| **GGPO + Tailscale** | ✅ Funcional | Desde celular incluso |
| **GGPO + P2P LAN** | ✅ Funcional | Misma red |

---

## Próximos Pasos (para retomar)

1. **Verificar router:** Entrar a 192.168.1.1, habilitar UPnP explícitamente
2. **Probar port forwarding manual:** Configurar regla manual en el router para puerto P2P
3. **Probar con waitForRelayAck corregido:** Si el router alguna vez aplica UPnP, el fix 8a8b177 podría ser suficiente
4. **Probar en otro ISP:** No todos los routers ignoran UPnP
5. **Alternativa:** Usar VPS con relay UDP si el ISP del host no coopera
