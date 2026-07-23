# 02 — Análisis Técnico del Sistema P2P

**Módulo:** 18-P2P-Propio  
**Fecha:** 2026-07-23

## 1. Resumen ejecutivo

La arquitectura propuesta es factible con Electron + TypeScript + Node.js + Nakama.

La estrategia recomendada es:

```text
LAN Direct
   ↓
UDP Hole Punching
   ↓
P2P Direct
   ↓
Host Relay
   ↓
Failure
```

El sistema debe considerarse **P2P-first**, no un sustituto universal de una VPN.

Un relay alojado en el host solo funciona si el peer remoto puede alcanzar el endpoint UDP del host. Por ello, `HOST_RELAY` no garantiza resolver todos los casos de NAT.

---

# 2. Análisis del dominio

## 2.1 NAT

NAT traduce direcciones privadas a una dirección pública.

Ejemplo:

```text
192.168.1.20:50000
        ↓
203.0.113.10:42100
```

El mapping puede expirar si no recibe tráfico.

---

## 2.2 UDP Hole Punching

Proceso:

```text
Peer A                    Peer B
  │                         │
  │──── UDP probe ─────────►│
  │◄──── UDP probe ─────────│
  │                         │
  │──── handshake ─────────►│
  │◄──── ACK ───────────────│
  │                         │
  └──── Direct UDP ─────────┘
```

Nakama coordina el momento y entrega candidatos, pero no transporta gameplay.

---

## 2.3 STUN

STUN permite conocer el endpoint observado por un servidor externo.

Ejemplo:

```text
Local:
192.168.1.10:45000

STUN observa:
181.23.10.20:32100
```

La implementación puede usar un servidor STUN existente.

STUN no garantiza por sí mismo hole punching exitoso.

---

## 2.4 NAT simétrico

En un NAT simétrico, el puerto público puede variar según destino.

Por ello:

```text
A → STUN = endpoint X
A → B     = endpoint Y
```

La información obtenida de STUN puede no servir directamente para B.

El sistema deberá limitar el tiempo de punching y usar una ruta alternativa.

---

# 3. Comparación de arquitecturas

## 3.1 WebRTC

### Ventajas

- NAT traversal maduro.
- ICE.
- STUN.
- TURN.
- DataChannel.
- Amplia documentación.

### Desventajas

- Integración más compleja con Node/Electron.
- Necesidad de implementar signaling.
- TURN requiere infraestructura.
- Añade una capa que no es necesaria para un transporte UDP simple.

### Veredicto

No es la primera elección para este proyecto porque RetroArch ya utiliza UDP y no requiere DataChannel.

---

## 3.2 UDP hole punching custom

### Ventajas

- Control completo.
- `node:dgram`.
- Sin binarios.
- Baja latencia.
- Integración directa con Electron.

### Desventajas

- NAT traversal complejo.
- Relay incompleto para ciertos NAT.
- Más trabajo de testing.

### Veredicto

**Opción recomendada para el MVP.**

---

## 3.3 libp2p

### Ventajas

- Arquitectura P2P completa.
- Discovery.
- Transports.
- Multiplexing.

### Desventajas

- Sobreingeniería.
- Mayor superficie de dependencias.
- El transporte de RetroArch no necesita su abstracción.

### Veredicto

No recomendado para el MVP.

---

# 4. Comparación de librerías

La disponibilidad y mantenimiento de paquetes npm deben verificarse durante la implementación.

## 4.1 Implementación propia

```text
node:dgram
```

### Ventajas

- Cero dependencia específica de NAT traversal.
- Control absoluto.
- Fácil de auditar.

### Desventajas

- Hay que implementar protocolo y tests.

### Recomendación

Preferida para el núcleo.

---

## 4.2 utp-punch

Puede evaluarse como referencia o dependencia si la versión disponible en npm mantiene compatibilidad con Electron y Node.js actuales.

Debe validarse:

- mantenimiento;
- TypeScript;
- compatibilidad ESM/CJS;
- compatibilidad Electron;
- licencia;
- soporte real para NAT traversal.

---

## 4.3 udp-hole-puncher

Misma consideración.

No debe incorporarse una librería únicamente por su nombre. Debe existir evidencia de mantenimiento y compatibilidad con el runtime usado por Emu Latam.

---

# 5. Dependencias recomendadas

## Núcleo

```text
node:dgram
node:net
node:os
node:crypto
```

No requieren npm.

## STUN

Se recomienda seleccionar una librería STUN mantenida y compatible con Electron después de una auditoría de versiones.

La versión debe fijarse en `package.json` y lockfile.

## Testing

Preferencia:

```text
vitest
```

Alternativamente:

```text
node:test
```

## Recomendación de política de dependencias

```text
Dependencia externa
    ↓
¿Necesaria?
    ↓
¿Mantenida?
    ↓
¿Compatible Electron?
    ↓
¿TypeScript?
    ↓
¿Licencia compatible?
    ↓
¿Tests?
    ↓
Adoptar
```

---

# 6. Relay Host vs VPS

| Criterio | Host Relay | VPS Relay |
|---|---:|---:|
| Costo | 0 | Variable |
| Latencia | Baja si host cercano | Variable |
| Disponibilidad | Depende de NAT | Alta |
| Escalabilidad | Limitada | Alta |
| Cobertura | Parcial | Alta |
| Complejidad | Media/Alta | Media |
| Dependencia externa | No | Sí |

### Decisión

MVP: Host Relay.

Futuro: Relay externo opcional.

---

# 7. Riesgos

## R1 — Hole punching falla

**Mitigación:** timeout corto + fallback.

## R2 — Host no accesible

**Mitigación:** informar `NO_ROUTE_AVAILABLE`; relay externo futuro.

## R3 — NAT cambia endpoint

**Mitigación:** keepalive + renegociación.

## R4 — Paquetes mezclados

**Mitigación:** `sessionId` + `peerId` + tabla de endpoints.

## R5 — Host se desconecta

**Mitigación MVP:** finalizar sala.

## R6 — Versión incompatible

**Mitigación:** negociación de versión.

## R7 — Saturación relay

Con 16 peers, el host puede procesar tráfico de múltiples conexiones.

**Mitigación:**

- límites por sesión;
- backpressure;
- métricas;
- límites de datagramas.

---

# 8. Decisiones técnicas

| Decisión | Elección |
|---|---|
| Transporte | UDP |
| Socket P2P | `node:dgram` |
| Socket RetroArch | Separado |
| Signaling | Nakama |
| LAN | Detección + handshake |
| NAT | STUN + pruebas reales |
| Punching | Propio |
| Relay MVP | Host |
| Multi-peer | Sí |
| React networking | No |
| IPC | Sí |
| Versionado | Sí |

---

# 9. Conclusión

La implementación propia es la alternativa más pragmática para Emu Latam.

La arquitectura no debe intentar convertirse en una VPN. Debe resolver únicamente:

```text
Discovery
Signaling
Connectivity
Transport Selection
Relay
```

RetroArch seguirá siendo responsable del gameplay.

> Ver arquitectura completa en `03-Diseno.md`.
