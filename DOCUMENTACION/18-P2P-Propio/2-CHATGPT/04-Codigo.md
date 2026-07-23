# 04 — Especificación de Código

**Módulo:** 18-P2P-Propio  
**Fecha:** 2026-07-23

## 1. Estructura propuesta

```text
src/
├── main/
│   ├── p2p/
│   │   ├── P2PManager.ts
│   │   ├── P2PService.ts
│   │   ├── PeerManager.ts
│   │   ├── SignalingClient.ts
│   │   ├── LanDetector.ts
│   │   ├── StunClient.ts
│   │   ├── NatClassifier.ts
│   │   ├── HolePuncher.ts
│   │   ├── DirectTransport.ts
│   │   ├── Relay.ts
│   │   ├── KeepAlive.ts
│   │   ├── Protocol.ts
│   │   ├── PacketCodec.ts
│   │   ├── StateMachine.ts
│   │   ├── types.ts
│   │   └── errors.ts
│   │
│   ├── ipc/
│   │   └── p2pHandlers.ts
│   │
│   └── game/
│       └── launchGame.ts
│
├── preload/
│   └── p2pApi.ts
│
└── renderer/
    └── ...
```

---

# 2. Types

```typescript
export type TransportMode =
  | 'lan'
  | 'direct'
  | 'relay';

export type NATType =
  | 'OPEN'
  | 'CONE_NAT'
  | 'RESTRICTED_NAT'
  | 'SYMMETRIC_NAT'
  | 'UNKNOWN';

export interface PeerInfo {
  peerId: string;
  roomId: string;
  localCandidates: LocalCandidate[];
  publicCandidate?: PublicCandidate;
  natType?: NATType;
}

export interface LocalCandidate {
  address: string;
  port: number;
}

export interface PublicCandidate {
  address: string;
  port: number;
}

export interface P2PServiceInfo {
  peerId: string;
  port: number;
  candidates: LocalCandidate[];
}
```

---

# 3. startP2PService()

```typescript
import dgram from 'node:dgram';

export async function startP2PService(): Promise<P2PServiceInfo> {
  const socket = dgram.createSocket('udp4');

  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject);
    socket.bind(0, '0.0.0.0', () => resolve());
  });

  const address = socket.address();

  if (typeof address !== 'object') {
    throw new Error('Unable to obtain UDP address');
  }

  return {
    peerId: getLocalPeerId(),
    port: address.port,
    candidates: getLocalCandidates(address.port),
  };
}
```

El socket debe mantenerse vivo mientras exista la sesión.

---

# 4. LAN detection

```typescript
import os from 'node:os';

export function getLocalCandidates(port: number): LocalCandidate[] {
  const interfaces = os.networkInterfaces();

  const result: LocalCandidate[] = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (
        entry.family === 'IPv4' &&
        !entry.internal
      ) {
        result.push({
          address: entry.address,
          port,
        });
      }
    }
  }

  return result;
}
```

La comparación de subred debe utilizar la máscara de red.

La detección debe finalizar con un handshake real.

---

# 5. doHolePunch(peerInfo)

```typescript
export async function doHolePunch(
  socket: dgram.Socket,
  peerInfo: PeerInfo,
  timeoutMs = 7000,
): Promise<boolean> {

  const candidates = buildCandidates(peerInfo);

  return new Promise<boolean>((resolve) => {
    let connected = false;

    const timer = setTimeout(() => {
      if (!connected) {
        resolve(false);
      }
    }, timeoutMs);

    const onMessage = (message, rinfo) => {
      if (!isValidPunchResponse(message, peerInfo, rinfo)) {
        return;
      }

      connected = true;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(true);
    };

    socket.on('message', onMessage);

    for (const candidate of candidates) {
      sendPunchBurst(socket, candidate);
    }
  });
}
```

El algoritmo real debe:

- enviar probes repetidos;
- aceptar respuestas de endpoints válidos;
- validar `sessionId`;
- validar `peerId`;
- evitar aceptar tráfico no autenticado.

---

# 6. Relay

```typescript
export class UDPRelay {
  private peers = new Map<string, RelayPeer>();

  registerPeer(peer: RelayPeer): void {
    this.peers.set(peer.peerId, peer);
  }

  unregisterPeer(peerId: string): void {
    this.peers.delete(peerId);
  }

  forward(
    sourcePeerId: string,
    payload: Buffer,
  ): void {
    for (const peer of this.peers.values()) {
      if (peer.peerId === sourcePeerId) {
        continue;
      }

      sendUDP(
        peer.endpoint.address,
        peer.endpoint.port,
        payload,
      );
    }
  }
}
```

En producción, el relay debe estar asociado a una sesión:

```typescript
Map<sessionId, RelaySession>
```

Y nunca reenviar paquetes entre salas diferentes.

---

# 7. startRelay()

```typescript
export function startRelay(
  socket: dgram.Socket,
  session: RelaySession,
): void {

  socket.on('message', (packet, rinfo) => {
    const decoded = decodePacket(packet);

    if (!decoded) {
      return;
    }

    if (decoded.sessionId !== session.sessionId) {
      return;
    }

    const peer = findPeerByEndpoint(
      session,
      rinfo.address,
      rinfo.port,
    );

    if (!peer) {
      return;
    }

    peer.lastSeen = Date.now();

    relayToOtherPeers(
      session,
      peer.peerId,
      decoded.payload,
    );
  });
}
```

La resolución de peer debe evitar depender exclusivamente de IP pública.

---

# 8. detectNATType()

```typescript
export async function detectNATType(): Promise<NATType> {
  const mappingA = await queryStunServer(STUN_SERVER_A);
  const mappingB = await queryStunServer(STUN_SERVER_B);

  if (!mappingA || !mappingB) {
    return 'UNKNOWN';
  }

  if (
    mappingA.address === getLocalPublicAddress()
  ) {
    return 'OPEN';
  }

  if (
    mappingA.port === mappingB.port &&
    mappingA.address === mappingB.address
  ) {
    return 'CONE_NAT';
  }

  if (
    mappingA.address === mappingB.address
  ) {
    return 'RESTRICTED_NAT';
  }

  return 'SYMMETRIC_NAT';
}
```

Esto es pseudocódigo. La clasificación exacta depende de la metodología STUN utilizada.

No debe utilizarse como única prueba de conectividad.

---

# 9. keepAlive()

```typescript
export function keepAlive(
  socket: dgram.Socket,
  peer: PeerInfo,
): NodeJS.Timeout {

  return setInterval(() => {
    const packet = encodePacket({
      type: PacketType.PING,
      version: PROTOCOL_VERSION,
      sessionId: peer.roomId,
      peerId: peer.peerId,
    });

    sendToPeer(socket, peer, packet);
  }, 15_000);
}
```

El heartbeat de control puede ejecutarse cada 5 segundos.

El NAT keepalive cada 15 segundos.

---

# 10. handlePeerDisconnect()

```typescript
export function handlePeerDisconnect(
  peerId: string,
  reason: string,
): void {

  peerManager.markDisconnected(
    peerId,
    reason,
  );

  stopKeepAlive(peerId);

  emitP2PEvent({
    type: 'disconnected',
    peerId,
    reason,
  });

  if (peerId === hostPeerId) {
    handleHostDisconnect();
  }
}
```

---

# 11. P2PManager

```typescript
export class P2PManager {
  private service?: P2PService;

  async start(): Promise<P2PServiceInfo> {
    this.service = await P2PService.start();
    return this.service.info();
  }

  async connect(
    roomId: string,
    peerId: string,
  ): Promise<void> {

    const peer = await this.signaling.getPeer(
      roomId,
      peerId,
    );

    if (await this.tryLan(peer)) {
      return;
    }

    if (await this.tryDirect(peer)) {
      return;
    }

    if (await this.tryRelay(peer)) {
      return;
    }

    throw new Error(
      'NO_ROUTE_AVAILABLE',
    );
  }
}
```

---

# 12. IPC Main Process

```typescript
ipcMain.handle(
  'p2p:start',
  async () => {
    return p2pManager.start();
  },
);

ipcMain.handle(
  'p2p:connect',
  async (_event, input) => {
    return p2pManager.connect(
      input.roomId,
      input.peerId,
    );
  },
);

ipcMain.handle(
  'p2p:stop',
  async () => {
    return p2pManager.stop();
  },
);
```

---

# 13. Preload

```typescript
contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    p2p: {
      start: () =>
        ipcRenderer.invoke('p2p:start'),

      connect: (input) =>
        ipcRenderer.invoke(
          'p2p:connect',
          input,
        ),

      stop: () =>
        ipcRenderer.invoke('p2p:stop'),
    },
  },
);
```

---

# 14. React

```typescript
async function onRetar(roomId: string, peerId: string) {
  setConnectionState('connecting');

  try {
    await window.electronAPI.p2p.connect({
      roomId,
      peerId,
    });

    setConnectionState('connected');

    await window.electronAPI.launchGame();
  } catch (error) {
    setConnectionState('error');
  }
}
```

React no debe importar `dgram` ni ejecutar lógica de red.

---

# 15. Nakama

El signaling puede utilizar el canal de match existente.

Ejemplo:

```typescript
interface P2PSignalMessage {
  type:
    | 'p2p_announce'
    | 'p2p_offer'
    | 'p2p_candidate'
    | 'p2p_connect'
    | 'p2p_connected'
    | 'p2p_disconnect';

  version: 1;

  roomId: string;
  peerId: string;

  payload: unknown;

  timestamp: number;
}
```

Los mensajes de signaling no transportan gameplay.

---

# 16. launch-game

La información para RetroArch deberá seleccionar el endpoint correspondiente al transporte:

```text
DIRECT
  → endpoint directo

RELAY
  → endpoint del relay
```

El relay debe ser transparente al protocolo de gameplay.

RetroArch mantiene:

```text
UDP 55435
```

El P2P service mantiene:

```text
UDP dynamic port
```

---

# 17. Tests

Casos mínimos:

```text
P2PService
 ├── binds dynamic port
 ├── releases port
 └── handles bind error

LAN
 ├── detects local interface
 ├── rejects incompatible subnet
 └── confirms handshake

Punching
 ├── succeeds
 ├── times out
 └── rejects invalid session

Relay
 ├── routes A → B
 ├── routes B → A
 ├── isolates sessions
 └── handles 16 peers

Keepalive
 ├── sends ping
 ├── receives pong
 └── detects timeout
```

---

# 18. Referencias

- Arquitectura: `03-Diseno.md`
- Requerimientos: `01-Requerimientos.md`
- Plan: `05-Checklist.md`
