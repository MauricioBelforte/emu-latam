# 02 - Análisis Técnico — Relay WAN para GGPO vía P2P

> **Módulo:** 19-GGPO-P2P-WAN
> **Fecha:** 2026-07-24
> **Versión:** 1.0

---

## 1. Análisis del Problema

GGPO (implementado en fcadefbneo) usa UDP directo entre peers:
- Player 0: `bind(6003)` + `sendto(peer1Ip:6004)`
- Player 1: `bind(6004)` + `sendto(peer0Ip:6003)`

Para que funcione entre redes distintas, se necesita que cada peer pueda recibir UDP del otro. Detrás de NAT, esto requiere:
1. **Hole punching directo** en puertos 6003/6004
2. **O relay** que reenvíe el tráfico

### 1.1 Por qué hole punching directo no es suficiente

El módulo P2P existente (18-P2P-Propio) ya implementa hole punching, pero lo hace en un **puerto dinámico** (`bind(0)`) que es el que se negocia entre peers. El problema es que GGPO usa **puertos fijos** (6003/6004):
- No podemos cambiar el puerto de escucha de GGPO sin modificar fcadefbneo
- Hacer hole punching en 6003/6004 requeriría bindear esos puertos, que pueden estar ocupados por otros procesos
- Si el hole punching falla, GGPO no tiene relay nativo

### 1.2 Solución: Relay UDP via P2P

En lugar de intentar conectar GGPO directamente, interceptamos su tráfico UDP y lo tunelizamos a través del P2P relay:

```
GGPO P0 (6003) ↔ socket local ↔ RELAY_DATA ↔ P2P transport
                                                    ↕ red
GGPO P1 (6004) ↔ forwarder local ↔ RELAY_DATA ↔ P2P transport
```

**Ventajas:**
- GGPO no necesita saber que está siendo relayeado (conecta a 127.0.0.1)
- El P2P module ya maneja hole punching/NAT traversal por su cuenta
- Si hole punching falla, el P2P relay nativo del módulo ya es el fallback
- El tráfico de GGPO viaja cifrado/autenticado por el canal P2P (si se implementa)

**Desventajas:**
- Latencia extra (relay en localhost + P2P processing)
- El host debe mantener su P2PManager activo durante toda la partida

---

## 2. Comparación de Alternativas

| Alternativa | Ventajas | Desventajas | Decisión |
|:---|:---|:---|:---|
| **A: STUN + Port Forwarding** | Sin relay, latencia mínima | Usuario debe abrir puertos en router. No automático. | ❌ Descartado |
| **B: Tailscale (existente)** | Ya funciona, cero configuración | Dependencia externa. No reemplaza, es otro método. | ❌ No es P2P propio |
| **C: Relay UDP via P2P** | Automático, sin configuración, reusa P2P existente | Latencia extra del relay (~1-5ms localhost) | ✅ Elegido |

### 2.1 Decisión: Relay UDP via P2P (C)

El relay P2P es la mejor opción porque:
1. Reusa el módulo P2P existente (hole punching, NAT traversal, keepalive)
2. No requiere configuración del usuario
3. Es transparente para GGPO (conecta a localhost)
4. Ya tenemos la infraestructura de forwarder/relay en `p2pBridge.ts`, solo hay que adaptarla para puertos 6003/6004

---

## 3. Arquitectura del Relay

### 3.1 Host Side (Relay)

```
┌─────────────────────────────────────────────┐
│              HOST MACHINE                    │
│                                              │
│  GGPO P0 (127.0.0.1:6003)                   │
│       ↕ (UDP local)                         │
│  relaySocket (127.0.0.1:RPORT)              │
│       ↕ (RAW data)                          │
│  ggpoP2PBridge (P2PManager)                 │
│       ↕ (RELAY_DATA packets)                │
│  P2P UDP transport                          │
└──────────────────┬──────────────────────────┘
                   │ Internet (NAT traversal)
┌──────────────────┴──────────────────────────┐
│              GUEST MACHINE                   │
│                                              │
│  P2P UDP transport                           │
│       ↕ (RELAY_DATA packets)                │
│  ggpoP2PBridge (P2PManager)                 │
│       ↕ (RAW data)                          │
│  forwarderSocket (127.0.0.1:FPORT)          │
│       ↕ (UDP local)                         │
│  GGPO P1 (127.0.0.1:6004)                   │
└─────────────────────────────────────────────┘
```

### 3.2 Datos en Tránsito

Cada paquete UDP de GGPO se encapsula como:

```
┌──────────────────────────────────────────────┐
│ P2P Header (4 bytes)                         │
│   Version (1) | Type=RELAY_DATA(0x05)        │
│   Session Token (2 bytes)                    │
├──────────────────────────────────────────────┤
│ Payload = datos UDP crudos de GGPO           │
│ (hasta 1472 bytes para evitar fragmentación) │
└──────────────────────────────────────────────┘
```

---

## 4. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|:---|:---|:---|:---|
| NAT del host es Symmetric y P2P cae a relay | Latencia extra (doble relay) | Media | Aceptable, GGPO es tolerante a latencia |
| forwarderPort colisiona con otro servicio | Falla al crear forwarder | Baja | Usar `bind(0)` para puerto dinámico |
| P2PManager se desconecta durante partida | GGPO pierde conexión | Baja | Keepalive del P2P module lo detecta; reconexión manual |
| relaySocket no puede enviar a GGPO host | GGPO no recibe datos del guest | Baja | relaySocket usa `send()` a 127.0.0.1:6003, siempre disponible si GGPO está escuchando |
| Confusión entre ggpoP2PBridge y p2pBridge | Estado global compartido | Media | Token counters separados, variables globales separadas, cero estado compartido |

---

## 5. Dependencias

```json
{
  "dependencies": {
    // Sin nuevas dependencias runtime
  },
  "devDependencies": {
    // Sin nuevas dependencias dev
  }
}
```

Cero nuevas dependencias. Solo usa:
- `dgram` (Node.js built-in)
- `P2PManager` de p2p-module (ya existe)
- `PacketType`, `encodePacket`, `decodePacket` de p2p-module (ya existen)
