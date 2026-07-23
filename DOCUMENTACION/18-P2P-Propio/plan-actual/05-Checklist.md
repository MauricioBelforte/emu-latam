# 05 - Checklist de Implementación (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Versión:** 1.1

---

## Fase 1 — MVP (1v1, reemplazo Tailscale/Bore)

| # | Tarea | Complejidad | Ref. |
|:---|:---|:---|:---|
| 1.1 | Definir tipos en `protocol/types.ts` | 🟢 Baja | 04-Codigo §1 |
| 1.2 | Implementar encode/decode en `protocol/packet.ts` + tests | 🟢 Baja | 04-Codigo §2 |
| 1.3 | Implementar `UDPTransport` (wrapper dgram, bind(0)) | 🟡 Media | 04-Codigo §4 |
| 1.4 | Implementar `NatDetector` (2 STUN servers, Cone/Symmetric) | 🟡 Media | 04-Codigo §3 |
| 1.5 | Implementar `SignalingChannel` (Nakama opcodes 100-103) | 🟡 Media | 03-Diseno §7 |
| 1.6 | Implementar `HolePuncher` con backoff exponencial | 🟡 Media | 04-Codigo §4 |
| 1.7 | Implementar `RelayServer` básico 1v1 | 🟡 Media | 04-Codigo §5 |
| 1.8 | Implementar `KeepAliveService` (18s, 3-strikes) | 🟢 Baja | 04-Codigo §6 |
| 1.9 | Implementar `StateMachine` | 🟡 Media | 03-Diseno §8 |
| 1.10 | Implementar `P2PManager` (orquestador) | 🔴 Alta | 04-Codigo §7 |
| 1.11 | Registrar handlers IPC (`p2p:host-start`, `p2p:guest-join`, `p2p:cancel`) | 🟢 Baja | 04-Codigo §8 |
| 1.12 | Conectar botón "RETAR" al flujo IPC | 🟢 Baja | — |
| 1.13 | UI: spinner + estados básicos | 🟢 Baja | — |

**Estimación Fase 1:** ~10-12 días hábiles

---

## Fase 2 — Mejoras (multi-peer, LAN, robustez)

| # | Tarea | Complejidad |
|:---|:---|:---|
| 2.1 | Multi-guest en RelayServer (socket dedicado por guest) | 🔴 Alta |
| 2.2 | Detección LAN con carrera de candidatos | 🟡 Media |
| 2.3 | Manejo de desconexión + limpieza | 🟡 Media |
| 2.4 | Hardening: descartar paquetes inválidos, rate-limit | 🟡 Media |
| 2.5 | Logging configurable con IPs enmascaradas | 🟢 Baja |
| 2.6 | Test de carga: 16 peers simulados | 🔴 Alta |
| 2.7 | Excepción de firewall en instalación | 🟡 Media |

**Estimación Fase 2:** ~8-10 días hábiles

---

## Fase 3 — Avanzado (opcional)

| # | Tarea | Complejidad |
|:---|:---|:---|
| 3.1 | Cifrado con `tweetnacl` (secretbox) | 🟡 Media |
| 3.2 | UPnP/NAT-PMP oportunista | 🔴 Alta |
| 3.3 | Punching asimétrico (Cone+Symm intentar igual) | 🟡 Media |
| 3.4 | Sub-clasificación fina de NAT con STUN propio | 🔴 Alta |
| 3.5 | Puerto preferido configurable | 🟢 Baja |
| 3.6 | Métricas de red en la UI | 🟡 Media |
| 3.7 | Host migration básica | 🔴 Alta |

---

## Dependencias entre Tareas

```
1.1 (types) → 1.2 (packet) → 1.3 (UDPTransport) → 1.4 (NatDetector)
                                                    → 1.6 (HolePuncher)
                                                    → 1.7 (RelayServer)
                                                    → 1.8 (KeepAliveService)
                                       ↓
                                   1.10 (P2PManager) ← 1.9 (StateMachine)
                                       ↓
                                   1.11 (IPC handlers) ← 1.5 (SignalingChannel)
                                       ↓
                                   1.12 (botón RETAR) + 1.13 (UI)
```
