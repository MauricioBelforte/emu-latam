# 04 - Especificación de Código e Implementación (Emu Latam)

> **Módulo:** 18-P2P-Propio  
> **Fecha:** 2026-07-23  
> **Estado:** Propuesta de Arquitectura v1.0  
> **Referencias:** Ver `03-Diseno.md`  

---

## 1. Estructura de Archivos y Carpetas

```
src/
├── main/
│   └── p2p/
│       ├── types.ts
│       ├── Protocol.ts
│       ├── NATDetector.ts
│       ├── P2PSocket.ts
│       ├── UDPRelayManager.ts
│       ├── LocalRetroArchProxy.ts
│       ├── P2POrchestrator.ts
│       └── index.ts
└── preload/
    └── index.ts  # Exposición IPC vía contextBridge
```

---

## 2. Definición de Tipos e Interfaces (`types.ts`)

```typescript
export enum NATType {
  FULL_CONE = 'FULL_CONE',
  ADDRESS_RESTRICTED_CONE = 'ADDRESS_RESTRICTED_CONE',
  PORT_RESTRICTED_CONE = 'PORT_RESTRICTED_CONE',
  SYMMETRIC = 'SYMMETRIC',
  UNKNOWN = 'UNKNOWN'
}

export enum P2PState {
  IDLE = 'IDLE',
  STUN_LOOKUP = 'STUN_LOOKUP',
  SIGNALING = 'SIGNALING',
  HOLE_PUNCHING = 'HOLE_PUNCHING',
  DIRECT_CONNECTED = 'DIRECT_CONNECTED',
  RELAY_CONNECTED = 'RELAY_CONNECTED',
  DISCONNECTED = 'DISCONNECTED'
}

export enum PacketType {
  PUNCH = 0x01,
  GAME_DATA = 0x02,
  KEEPALIVE_PING = 0x03,
  KEEPALIVE_PONG = 0x04,
  RELAY_WRAPPER = 0x05
}

export interface PeerCandidate {
  peerId: string;
  publicIp: string;
  publicPort: number;
  privateIp: string;
  privatePort: number;
  natType: NATType;
  sessionId: number;
}

export interface P2PStatusPayload {
  state: P2PState;
  progressPercentage: number;
  message: string;
  isRelay: boolean;
  latencyMs?: number;
}
```

---

## 3. Especificación del Protocolo Binario (`Protocol.ts`)

```typescript
import { PacketType } from './types';

export const MAGIC_BYTE_1 = 0x45; // 'E'
export const MAGIC_BYTE_2 = 0x4d; // 'M'
export const PROTOCOL_VERSION = 0x01;
export const HEADER_SIZE = 8;

export class Protocol {
  public static encodePacket(type: PacketType, sessionId: number, payload?: Buffer): Buffer {
    const dataLen = payload ? payload.length : 0;
    const buf = Buffer.alloc(HEADER_SIZE + dataLen);

    buf.writeUInt8(MAGIC_BYTE_1, 0);
    buf.writeUInt8(MAGIC_BYTE_2, 1);
    buf.writeUInt8(PROTOCOL_VERSION, 2);
    buf.writeUInt8(type, 3);
    buf.writeUInt32BE(sessionId, 4);

    if (payload && dataLen > 0) {
      payload.copy(buf, HEADER_SIZE);
    }

    return buf;
  }

  public static decodeHeader(buf: Buffer) {
    if (buf.length < HEADER_SIZE) return null;

    const magic1 = buf.readUInt8(0);
    const magic2 = buf.readUInt8(1);
    if (magic1 !== MAGIC_BYTE_1 || magic2 !== MAGIC_BYTE_2) return null;

    return {
      version: buf.readUInt8(2),
      type: buf.readUInt8(3) as PacketType,
      sessionId: buf.readUInt32BE(4),
      payload: buf.subarray(HEADER_SIZE)
    };
  }
}
```

---

## 4. Detección de NAT con STUN (`NATDetector.ts`)

```typescript
import stun from 'stun';
import { NATType } from './types';

export class NATDetector {
  private static STUN_SERVERS = [
    'stun.l.google.com:19302',
    'stun1.l.google.com:19302'
  ];

  public static async detectNAT(): Promise<{ natType: NATType; publicIp: string; publicPort: number }> {
    try {
      const res = await stun.request(this.STUN_SERVERS[0]);
      const mappedAddr = res.getXorAddress();

      if (!mappedAddr) {
        return { natType: NATType.UNKNOWN, publicIp: '', publicPort: 0 };
      }

      // Por simplicidad en MVP, si responde STUN mapeado correctamente asignamos Cone NAT
      return {
        natType: NATType.PORT_RESTRICTED_CONE,
        publicIp: mappedAddr.address,
        publicPort: mappedAddr.port
      };
    } catch (err) {
      console.error('[P2P] Error en STUN Lookup:', err);
      return { natType: NATType.SYMMETRIC, publicIp: '', publicPort: 0 };
    }
  }
}
```

---

## 5. Implementación del Engine P2P Core (`P2PSocket.ts`)

```typescript
import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import { Protocol } from './Protocol';
import { PacketType, PeerCandidate, P2PState } from './types';

export class P2PSocket extends EventEmitter {
  private socket: dgram.Socket;
  private localPort: number = 0;
  private keepAliveTimer?: NodeJS.Timeout;
  private sessionId: number = Math.floor(Math.random() * 0xFFFFFFFF);

  constructor() {
    super();
    this.socket = dgram.createSocket('udp4');
    this.setupListeners();
  }

  public async bind(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.socket.bind(0, () => {
        const addr = this.socket.address();
        this.localPort = addr.port;
        console.log(`[P2P] Socket UDP escuchando en puerto ${this.localPort}`);
        resolve(this.localPort);
      });
      this.socket.on('error', reject);
    });
  }

  public async doHolePunch(peer: PeerCandidate, maxAttempts = 10): Promise<boolean> {
    return new Promise((resolve) => {
      let attempts = 0;
      const targetIp = peer.publicIp;
      const targetPort = peer.publicPort;

      console.log(`[P2P] Perforando NAT hacia ${targetIp}:${targetPort}`);
      const punchBuf = Protocol.encodePacket(PacketType.PUNCH, this.sessionId);

      const interval = setInterval(() => {
        attempts++;
        this.socket.send(punchBuf, targetPort, targetIp);

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          resolve(false); // Timeout del hole punching
        }
      }, 200);

      const onAck = (receivedSession: number) => {
        if (receivedSession === peer.sessionId) {
          clearInterval(interval);
          this.off('peer_ack', onAck);
          resolve(true);
        }
      };
      this.on('peer_ack', onAck);
    });
  }

  public startKeepAlive(targetIp: string, targetPort: number): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      const pingBuf = Protocol.encodePacket(PacketType.KEEPALIVE_PING, this.sessionId);
      this.socket.send(pingBuf, targetPort, targetIp);
    }, 15000);
  }

  public stopKeepAlive(): void {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
  }

  private setupListeners(): void {
    this.socket.on('message', (msg, rinfo) => {
      const header = Protocol.decodeHeader(msg);
      if (!header) return;

      if (header.type === PacketType.PUNCH) {
        // Responder ACK al recibir perforación
        const ackBuf = Protocol.encodePacket(PacketType.KEEPALIVE_PONG, this.sessionId);
        this.socket.send(ackBuf, rinfo.port, rinfo.address);
        this.emit('peer_ack', header.sessionId);
      } else if (header.type === PacketType.GAME_DATA) {
        this.emit('game_data', header.payload);
      }
    });
  }

  public sendGameData(payload: Buffer, targetIp: string, targetPort: number) {
    const packet = Protocol.encodePacket(PacketType.GAME_DATA, this.sessionId, payload);
    this.socket.send(packet, targetPort, targetIp);
  }

  public close() {
    this.stopKeepAlive();
    this.socket.close();
  }
}
```

---

## 6. Relay Manager en el Host (`UDPRelayManager.ts`)

```typescript
import dgram from 'node:dgram';

export class UDPRelayManager {
  private clients: Map<string, { ip: string; port: number }> = new Map();

  public registerClient(id: string, ip: string, port: number) {
    this.clients.set(id, { ip, port });
    console.log(`[P2P Relay] Cliente registrado en relay: ${id} -> ${ip}:${port}`);
  }

  public relayPacket(senderId: string, packet: Buffer, socket: dgram.Socket) {
    // Reenviar a todos los demás clientes registrados menos al remitente
    for (const [clientId, target] of this.clients.entries()) {
      if (clientId !== senderId) {
        socket.send(packet, target.port, target.ip);
      }
    }
  }
}
```

---

## 7. Integración IPC en Electron Main (`index.ts`)

```typescript
import { ipcMain } from 'electron';
import { P2POrchestrator } from './P2POrchestrator';

const orchestrator = new P2POrchestrator();

export function setupP2PHandlers() {
  ipcMain.handle('p2p:host-room', async () => {
    return await orchestrator.startHostSession();
  });

  ipcMain.handle('p2p:join-room', async (_, matchMetadata) => {
    return await orchestrator.joinGuestSession(matchMetadata);
  });

  ipcMain.handle('p2p:stop-session', async () => {
    orchestrator.stop();
    return { success: true };
  });
}
```
