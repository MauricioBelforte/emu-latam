# 02 - Análisis Técnico

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Estado:** Plan inicial

---

## 1. Análisis del Dominio

### 1.1 NAT (Network Address Translation)

El principal obstáculo para P2P en internet. Los routers traducen IPs privadas a una IP pública compartida, bloqueando conexiones entrantes no solicitadas.

| Tipo de NAT | Asignación de puerto | Filtro de entrada | Hole punching |
|:---|:---|:---|:---|
| Full Cone | Fija por puerto local | Cualquier IP:puerto | ✅ Fácil |
| Address Restricted Cone | Fija por puerto local | Solo IPs conocidas | ✅ Posible |
| Port Restricted Cone | Fija por puerto local | Solo IP:puerto conocidos | ✅ Posible |
| Symmetric | Cambia por destino | Solo IP:puerto conocidos | ❌ Imposible |

**Dato clave:** ~70-80% de los NATs hogareños soportan hole punching. El 20-30% restante (symmetric/CGNAT) requiere relay.

### 1.2 UDP Hole Punching

Técnica donde ambos peers envían paquetes simultáneamente a la IP:puerto pública del otro, creando mappings en sus respectivos NATs antes de que llegue la respuesta del otro lado.

### 1.3 STUN (Session Traversal Utilities for NAT)

Protocolo para que un cliente descubra su IP pública y puerto, y opcionalmente el tipo de NAT. Servidores públicos gratuitos:
- `stun.l.google.com:19302`
- `stun1.l.google.com:19302`

---

## 2. Comparación de Alternativas de Arquitectura

| Criterio | WebRTC DataChannel | libp2p | Custom UDP (ELEGIDO) |
|:---|:---|:---|:---|
| Overhead | ~40-60 bytes/paquete | ~80-120 bytes | **8 bytes** (header propio) |
| Latencia | 8-15ms (DTLS + SCTP) | 12-25ms | **< 1ms** |
| Completidad | Media-Alta | Alta | **Baja** |
| Dependencias | `node-datachannel` (C++) | ~150 paquetes npm | **Solo dgram nativo** |
| Compatibilidad RetroArch | Requiere puente UDP↔SCTP | Requiere puente UDP↔stream | **UDP directo, transparente** |

**Decisión:** Custom UDP proxy con `node:dgram`. Es la opción más liviana, directa y sin dependencias externas. RetroArch habla UDP, nosotros hablamos UDP. No hay conversión de protocolos.

---

## 3. Comparación de Librerías npm

| Librería | Estado | Problema |
|:---|:---|:---|
| `utp-punch` | Inactiva, atada a µTP | No soporta multi-peer ni relay |
| `udp-hole-puncher` | Básica, 32 estrellas | No multiplexa, no relay |
| `stun` | Mantenida | Solo para STUN, no para todo el flujo |
| **Implementación propia** | — | Control total, ~500-700 líneas, cero deuda técnica |

**Decisión:** STUN usando la librería `stun` (liviana, probada) + implementación propia del hole punching, relay y proxy.

---

## 4. Estrategia de Relay

```
Opción A: Relay externo (VPS)
  Guest → Internet (55ms) → VPS Relay → Internet (55ms) → Host
  Latencia total: ~110ms + $5-10/mes

Opción B: Relay en el HOST (ELEGIDA)  
  Guest → Internet (55ms) → HOST (relay local)
  Latencia total: ~55ms + $0
```

**Decisión:** Relay en el host. El host ya está ejecutando RetroArch, su PC está encendida, y recibe tráfico de todas formas. Agregar reenvío UDP a otros guests tiene overhead casi nulo.

---

## 5. Plano de Arquitectura (3 Planos)

### Control Plane
- Estado: máquina de estados (FSM) del peer
- Comunicación: Nakama WebSocket (señalización)
- Mensajes: `P2P_SIGNAL` con payload JSON de candidatos

### Data Plane
- Estado: socket UDP directo o relay
- Comunicación: UDP puro vía `dgram`
- Paquetes: encabezado binario de 8 bytes + payload de juego

### Discovery Plane
- Estado: detección de NAT, LAN, candidatos
- Comunicación: STUN + Nakama
- Output: lista priorizada de candidatos (LAN > P2P directo > Relay)

---

## 6. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|:---|:---|:---|
| Symmetric NAT en ambos peers | Conexión imposible | Nakama notifica incompatibilidad. Sugiere cambiar host a quien tenga NAT abierto |
| Cierre de NAT por inactividad | Desconexión | Keepalive cada 15s |
| Conflicto de puertos | Error EADDRINUSE | `socket.bind(0)` para puerto dinámico |
| Host se desconecta | Sala caída | MVP: destruir sala y notificar. Futuro: host migration |
| Pérdida de paquetes en relay | Jitter | Relay solo reenvía, no almacena. RetroArch maneja pérdidas |

---

## 7. Dependencias Propuestas

```json
{
  "dependencies": {
    "stun": "^1.0.10"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "vitest": "^1.2.0"
  }
}
```

Solo `stun` para consultas STUN. Todo lo demás es Node.js nativo (`dgram`, `os`, `crypto`, `net`, `events`).
