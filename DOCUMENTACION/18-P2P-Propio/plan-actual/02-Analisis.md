# 02 - Análisis Técnico (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Versión:** 1.1
> **Cambios:** Clasificación NAT simplificada a Cone/Symmetric (2 STUN servers). Keepalive unificado. Relay con socket dedicado por guest.

---

## 1. Análisis del Dominio

### 1.1 Tipos de NAT — Clasificación Práctica

La literatura distingue 4 tipos, pero para efectos prácticos de implementación solo necesitamos 2:

| Tipo real | Nuestra clasificación | Comportamiento |
|:---|:---|:---|
| Full Cone | **Cone** | Puerto público fijo sin importar destino |
| Address Restricted Cone | **Cone** | Puerto público fijo, filtra por IP |
| Port Restricted Cone | **Cone** | Puerto público fijo, filtra por IP:puerto |
| Symmetric / CGNAT | **Symmetric** | Puerto público CAMBIA por destino |

**¿Por qué solo 2 buckets?** Distinguir Full/Restricted/Port-Restricted Cone requiere que el servidor STUN implemente `CHANGE-REQUEST` (RFC 3489). La mayoría de los STUN públicos actuales implementan RFC 5389/8489 que no lo exigen. En la práctica, la decisión es binaria: Cone (funciona hole punching) vs Symmetric (requiere relay).

### 1.2 Detección de Symmetric con 2 STUN servers

Consultar 2 servidores STUN distintos desde el mismo socket. Si el puerto público reportado es el mismo → Cone. Si es distinto → Symmetric. Simple, confiable, sin servidor propio.

---

## 2. Comparación de Alternativas

Ídem plan-inicial (WebRTC descartado, libp2p descartado, Custom UDP elegido). Ver `02-Analisis.md` en plan-inicial.

---

## 3. Decisiones Técnicas Clave

### 3.1 Header de 4 bytes (Claude)

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Version (1B) |  Type (1B)    |     Session Token (2B)        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Payload (variable)                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

Sin magic bytes (se validan por sessionToken + peer registration). Más compacto que 8 bytes.

### 3.2 Packet Types

| Valor | Tipo | Propósito |
|:---|:---|:---|
| 0x01 | PUNCH | Hole punching |
| 0x02 | PUNCH_ACK | Respuesta a hole punching |
| 0x03 | KEEPALIVE | Heartbeat |
| 0x04 | KEEPALIVE_ACK | Respuesta a heartbeat |
| 0x05 | RELAY_DATA | Paquete reenviado por relay |
| 0x06 | DISCONNECT | Cierre explícito |

### 3.3 Keepalive Unificado (3-strikes)

Un solo mecanismo: KEEPALIVE cada ~18s, se espera KEEPALIVE_ACK. Si se pierden 3 consecutivos (~54s) → DISCONNECTED. Reemplaza la separación artificial entre "NAT keepalive" y "heartbeat".

### 3.4 Relay con Socket Dedicado por Guest

Cada guest registrado en el relay obtiene **su propio socket local** (bind(0) en 127.0.0.1). El host mantiene un `Map<peerId, GuestRoute>` que permite:
- Aislamiento total de tráfico entre guests
- Cada guest ve su propio "canal" hacia RetroArch
- Sin riesgo de mezclar paquetes

### 3.5 Backoff Exponencial para Hole Punching

En lugar de ráfagas fijas cada 200ms, usar backoff exponencial: 400ms → 800ms → 1600ms (~2.8s total). Más respetuoso con routers y evita flooding innecesario.

---

## 4. Dependencias npm

```json
{
  "dependencies": {
    "stun": "^1.0.10"
  },
  "optionalDependencies": {
    "tweetnacl": "^1.0.3"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "vitest": "^2.x"
  }
}
```

Solo `stun` es obligatoria. `tweetnacl` es opcional para Fase 3 (cifrado).

---

## 5. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|:---|:---|:---|
| Symmetric-Symmetric | Conexión imposible | Relay inmediato sin intentar punching |
| CGNAT | Comportamiento Symmetric | Mismo tratamiento que Symmetric |
| Firewall bloquea UDP | Paquetes descartados | Excepción de firewall en instalación |
| Guest malicioso en relay | Security | Validación de sessionToken + solo reenvía a peers registrados vía Nakama |
| IP pública cambia | Desconexión | Keepalive detecta pérdida, se puede re-señalizar |
