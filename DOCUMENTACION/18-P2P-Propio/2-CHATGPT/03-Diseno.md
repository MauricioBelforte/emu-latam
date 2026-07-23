# 03 — Diseño de Arquitectura

**Módulo:** 18-P2P-Propio  
**Fecha:** 2026-07-23

## 1. Arquitectura general

```text
┌────────────────────────────────────────────────────────────┐
│                        EMU LATAM                            │
├────────────────────────────────────────────────────────────┤
│ React Renderer                                             │
│   │                                                        │
│   │ IPC                                                    │
│   ▼                                                        │
│ Electron Main Process                                      │
│   │                                                        │
│   ├── P2P Manager                                          │
│   │     ├── LAN Detector                                   │
│   │     ├── STUN Client                                    │
│   │     ├── NAT Classifier                                 │
│   │     ├── Hole Puncher                                   │
│   │     ├── Direct Transport                               │
│   │     ├── Relay                                          │
│   │     └── Keepalive                                      │
│   │                                                        │
│   └── RetroArch Process                                    │
│         └── UDP 55435                                      │
│                                                            │
└───────────────────────┬────────────────────────────────────┘
                        │
                        │ Signaling
                        ▼
                 ┌───────────────┐
                 │    NAKAMA     │
                 │ Match/Presence│
                 └───────────────┘
```

Nakama es control plane.

RetroArch es gameplay plane.

El P2P Manager administra conectividad.

---

# 2. Escenario: Host crea sala

```text
Host
 │
 ├─ create room
 │
 ▼
Nakama
 │
 └─ room created
       │
       ▼
Host P2P Manager
       │
       ├─ bind UDP :0
       ├─ detect interfaces
       ├─ STUN
       └─ publish candidates
```

---

# 3. Guest: hole punching exitoso

```text
Guest
 │
 ├─ join Nakama
 │
 ▼
Nakama
 │
 ├─ Host candidates
 └─ Guest candidates
 │
 ▼
Hole Puncher
 │
 ├─ UDP probes
 │
 ▼
Host
 │
 ├─ response
 │
 ▼
DIRECT_CONNECTED
 │
 ▼
launch-game
```

---

# 4. Guest: punching falla

```text
Guest
 │
 ▼
Hole Punching
 │
 X timeout
 │
 ▼
Try HOST_RELAY
 │
 ├─ relay reachable → RELAY_CONNECTED
 │
 └─ unreachable → FAIL
```

El relay no garantiza conectividad si el host no puede ser alcanzado desde Internet.

---

# 5. Keepalive

```text
Every 15 sec
     │
     ▼
NAT_KEEPALIVE
     │
     ▼
Peer mapping refreshed
```

Heartbeat:

```text
Every 5 sec
     │
     ▼
PING
     │
     ▼
PONG
```

Timeout:

```text
30 sec without response
        ↓
PEER_DISCONNECTED
```

---

# 6. LAN detection

Cada peer publica:

```typescript
interface LocalCandidate {
  address: string;
  port: number;
  family: 'IPv4';
}
```

El candidato LAN se considera válido cuando:

1. pertenece a una interfaz local compatible;
2. las subredes son compatibles;
3. el handshake UDP responde.

No se debe asumir que dos IP privadas visibles implican conectividad.

---

# 7. Estructura de módulos

```text
src/main/p2p/
├── P2PManager.ts
├── P2PService.ts
├── PeerManager.ts
├── SignalingClient.ts
├── LanDetector.ts
├── StunClient.ts
├── NatClassifier.ts
├── HolePuncher.ts
├── DirectTransport.ts
├── Relay.ts
├── KeepAlive.ts
├── Protocol.ts
├── PacketCodec.ts
├── StateMachine.ts
├── types.ts
└── errors.ts
```

---

# 8. API IPC

```typescript
interface P2PAPI {
  start(): Promise<P2PServiceInfo>;
  stop(): Promise<void>;

  connect(input: {
    roomId: string;
    peerId: string;
  }): Promise<void>;

  disconnect(peerId: string): Promise<void>;

  getStatus(): Promise<P2PStatus>;
}
```

Eventos:

```typescript
type P2PEvent =
  | {
      type: 'state';
      peerId: string;
      state: ConnectionState;
    }
  | {
      type: 'connected';
      peerId: string;
      transport: TransportMode;
    }
  | {
      type: 'disconnected';
      peerId: string;
      reason: string;
    }
  | {
      type: 'error';
      peerId?: string;
      code: string;
      message: string;
    };
```

---

# 9. Protocolo UDP

## 9.1 Header

```text
┌────────┬─────────┬──────────────┬──────────────┐
│ Magic  │ Version │ Message Type │ Session ID   │
│ 2 B    │ 1 B     │ 1 B          │ 16 B         │
└────────┴─────────┴──────────────┴──────────────┘
```

El protocolo P2P de control usa su propio header.

El tráfico de RetroArch no debe modificarse cuando se utilice la ruta directa.

---

## 9.2 Tipos

```typescript
enum PacketType {
  PING = 1,
  PONG = 2,
  PUNCH = 3,
  CONNECT = 4,
  CONNECT_ACK = 5,
  RELAY = 6,
  CLOSE = 7,
}
```

---

# 10. Estados

```typescript
type ConnectionState =
  | 'IDLE'
  | 'DISCOVERING'
  | 'LAN_CHECK'
  | 'PUNCHING'
  | 'DIRECT_CONNECTED'
  | 'RELAY_CONNECTING'
  | 'RELAY_CONNECTED'
  | 'DISCONNECTED'
  | 'FAILED';
```

Transiciones:

```text
IDLE
 ↓
DISCOVERING
 ↓
LAN_CHECK
 ├── success → DIRECT_CONNECTED
 └── fail
       ↓
   PUNCHING
    ├── success → DIRECT_CONNECTED
    └── fail
          ↓
    RELAY_CONNECTING
     ├── success → RELAY_CONNECTED
     └── fail → FAILED
```

---

# 11. Relay multi-peer

```typescript
interface RelaySession {
  sessionId: string;
  peers: Map<string, RelayPeer>;
}

interface RelayPeer {
  peerId: string;
  endpoint: {
    address: string;
    port: number;
  };
  lastSeen: number;
}
```

El endpoint no identifica por sí solo al peer.

Identidad:

```text
sessionId + peerId
```

El relay debe verificar que el datagrama pertenece a una sesión válida.

---

# 12. Estrategia de puertos

```text
Nakama
7350

RetroArch
55435

P2P
dynamic :0
```

El P2P Manager:

```typescript
socket.bind(0);
```

Después:

```typescript
const address = socket.address();

if (typeof address === 'object') {
  const p2pPort = address.port;
}
```

El puerto se libera con:

```typescript
socket.close();
```

---

# 13. Host migration

## MVP

```text
Host disconnect
      ↓
Nakama presence detects
      ↓
Room invalid
      ↓
Clients exit game
```

## Futuro

```text
Host disconnect
      ↓
Elect new host
      ↓
New P2P service
      ↓
Renegotiate
      ↓
Restart RetroArch session
```

No se recomienda implementar migración durante el MVP.

---

# 14. Integración con RETAR

```text
React
  │
  │ RETAR click
  ▼
window.electronAPI.p2p.connect()
  │
  ▼
P2PManager
  │
  ├─ LAN
  ├─ Direct
  └─ Relay
  │
  ▼
connected
  │
  ▼
launch-game
```

La UI puede subscribirse a:

```typescript
window.electronAPI.onP2PEvent(callback);
```

---

# 15. Versionado

Cada mensaje contiene:

```typescript
version: 1;
```

Reglas:

```text
same version → accept
compatible version → negotiate
unsupported → reject
```

El cambio de protocolo debe incrementar `version`.

---

# 16. Referencias

- Requerimientos: `01-Requerimientos.md`
- Implementación: `04-Codigo.md`
- Checklist: `05-Checklist.md`
