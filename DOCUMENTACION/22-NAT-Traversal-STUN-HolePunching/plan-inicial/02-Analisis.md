# 02 — Análisis: NAT Traversal (STUN + Hole Punching)

## Dominio

### STUN (Session Traversal Utilities for NAT)
- Protocolo estándar (RFC 5389) para descubrir IP:puerto público
- Servidores públicos gratuitos: `stun.l.google.com:19302`, `stun1.l.google.com:19302`
- Cliente envía un binding request UDP, servidor responde con mapped address
- No requiere autenticación ni cuenta

### UDP Hole Punching
- Técnica para establecer conexión P2P a través de NATs:
  1. Peer A envía un paquete UDP al endpoint público de Peer B
  2. Peer B simultáneamente envía un paquete al endpoint público de Peer A
  3. Ambos NATs crean/actualizan sus mapeos, permitiendo el tráfico entrante
  4. Una vez abiertos los agujeros, los pares pueden comunicarse directamente

### Tipos de NAT
| Tipo | Hole Punching | Ejemplo |
|------|--------------|---------|
| Conejo completo (Full Cone) | ✅ Siempre funciona | NAT antiguos, algunos routers hogareños |
| Conejo restringido (Restricted Cone) | ✅ Funciona | La mayoría de los routers |
| Conejo restringido por puerto (Port-Restricted Cone) | ✅ Funciona si ambos pares usan mismo puerto | Routers modernos |
| Simétrico (Symmetric) | ❌ No funciona | NATs corporativos, LTE/4G |

### Detección de NAT simétrica
- Si el puerto mapeado por STUN cambia entre requests → NAT simétrica
- Si el puerto se mantiene constante → podemos hacer hole punching

## Alternativas Consideradas

| Alternativa | Pros | Contras | Decisión |
|------------|------|---------|----------|
| **STUN + hole punching** | Sin servidor, P2P real, estándar | ~70-80% efectividad | ✅ Elegido |
| **TCP simultaneous open** | Alternativa para TCP | Complejo, no aplica a UDP (RA/GGPO usan UDP) | ❌ |
| **ICE completo (libnice)** | Framework completo | Dependencia externa complicada en Windows | ❌ |
| **WebRTC** | Nativo en Node.js v22+ | Versión Node.js actual no soporta todas las APIs | ❌ |
| **TURN (relay propio en VPS)** | 100% efectivo | Requiere VPS, costo mensual | ⏳ Futuro |

## Arquitectura Propuesta

```
[Peer A] → STUN → descubre endpointA
[Peer B] → STUN → descubre endpointB

[Peer A] ──(Nakama: endpointA)──→ [Peer B]
[Peer B] ──(Nakama: endpointB)──→ [Peer A]

[Peer A] ──UDP hole punch──→ endpointB
[Peer B] ──UDP hole punch──→ endpointA
         ↕ (simultáneo)
    Conexión P2P establecida!

Si timeout 5s → fallback a bore
```

## Decisiones de Diseño

1. **Módulo separado** `natTraversal.ts` en main process, no toca flujos existentes
2. **STUN embebido** usando `dgram` nativo (sin dependencias npm)
3. **Señalización via Nakama** `publishP2pConnectionConfirmed` (canal existente)
4. **Keep-alive** cada 15s con paquete de 1 byte
5. **Timeout hole punch**: 5s configurable
6. **Detección de NAT simétrica**: 2 requests STUN consecutivas, si el puerto mapeado cambia → saltear hole punch, ir directo a bore
7. **Integración en ChallengeContext**: nuevo método `"p2p_nat"` que se intenta primero, con fallback a `"bore"`
