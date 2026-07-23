# 04 - Especificación de Código

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Estado:** Plan inicial

---

## 1. Estructura de Archivos

```
client/src/main/p2p/
├── types.ts
├── Protocol.ts
├── NATDetector.ts
├── P2PSocket.ts
├── UDPRelayManager.ts
├── LocalProxy.ts
├── P2PManager.ts
└── index.ts
```

---

## 2. Types (`types.ts`)

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
  DISCOVERING = 'DISCOVERING',
  SIGNALING = 'SIGNALING',
  LAN_CHECK = 'LAN_CHECK',
  LAN_CONNECTED = 'LAN_CONNECTED',
  PUNCHING = 'PUNCHING',
  DIRECT_CONNECTED = 'DIRECT_CONNECTED',
  RELAY_CONNECTED = 'RELAY_CONNECTED',
  GAME_RUNNING = 'GAME_RUNNING',
  FAILED = 'FAILED'
}

export enum MessageType {
  PUNCH = 0x01,
  GAME_DATA = 0x02,
  KEEPALIVE_PING = 0x03,
  KEEPALIVE_PONG = 0x04,
  RELAY = 0x05,
  CLOSE = 0x06
}

export interface PeerCandidate {
  peerId: string;
  publicIp: string;
  publicPort: number;
  privateIp: string;
  privatePort: number;
  natType: NATType;
  sessionId: number;
  localIps: string[];
}

export interface P2PStatus {
  state: P2PState;
  progress: number;
  message: string;
  mode: 'lan' | 'direct' | 'relay' | null;
  latencyMs?: number;
}

export interface RelayPeer {
  id: string;
  ip: string;
  port: number;
  connectedAt: number;
}
```

---

## 3. Protocolo (`Protocol.ts`)

```typescript
import { MessageType } from './types';

export const MAGIC_1 = 0x45; // 'E'
export const MAGIC_2 = 0x4D; // 'M'
export const PROTOCOL_VERSION = 0x01;
export const HEADER_SIZE = 8;

export class Protocol {
  static encode(type: MessageType, sessionId: number, payload?: Buffer): Buffer {
    const len = payload ? payload.length : 0;
    const buf = Buffer.alloc(HEADER_SIZE + len);
    buf.writeUInt8(MAGIC_1, 0);
    buf.writeUInt8(MAGIC_2, 1);
    buf.writeUInt8(PROTOCOL_VERSION, 2);
    buf.writeUInt8(type, 3);
    buf.writeUInt32BE(sessionId, 4);
    if (payload) payload.copy(buf, HEADER_SIZE);
    return buf;
  }

  static decode(buf: Buffer): { version: number; type: MessageType; sessionId: number; payload: Buffer } | null {
    if (buf.length < HEADER_SIZE) return null;
    if (buf.readUInt8(0) !== MAGIC_1 || buf.readUInt8(1) !== MAGIC_2) return null;
    return {
      version: buf.readUInt8(2),
      type: buf.readUInt8(3) as MessageType,
      sessionId: buf.readUInt32BE(4),
      payload: buf.subarray(HEADER_SIZE)
    };
  }
}
```

---

## 4. Detector NAT (`NATDetector.ts`)

```typescript
import stun from 'stun';
import os from 'os';
import { NATType, PeerCandidate } from './types';

export class NATDetector {
  private static STUN_SERVERS = ['stun.l.google.com:19302', 'stun1.l.google.com:19302'];

  static getLocalIps(): string[] {
    const ips: string[] = [];
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address);
        }
      }
    }
    return ips;
  }

  static isSameSubnet(ip1: string, ip2: string): boolean {
    const o1 = ip1.split('.').map(Number);
    const o2 = ip2.split('.').map(Number);
    return o1[0] === o2[0] && o1[1] === o2[1] && o1[2] === o2[2];
  }

  static async detect(): Promise<{ natType: NATType; publicIp: string; publicPort: number }> {
    try {
      const res = await stun.request(NATDetector.STUN_SERVERS[0]);
      const addr = res.getXorAddress();
      if (!addr) return { natType: NATType.UNKNOWN, publicIp: '', publicPort: 0 };

      // Por ahora clasificamos como PORT_RESTRICTED_CONE (el más común)
      // Una mejora futura puede hacer detección más precisa
      return {
        natType: NATType.PORT_RESTRICTED_CONE,
        publicIp: addr.address,
        publicPort: addr.port
      };
    } catch {
      // Si STUN falla, probablemente sea Symmetric o sin internet
      return { natType: NATType.SYMMETRIC, publicIp: '', publicPort: 0 };
    }
  }
}
```

---

## 5. Socket P2P (`P2PSocket.ts`)

```typescript
import dgram from 'dgram';
import { EventEmitter } from 'events';
import { Protocol } from './Protocol';
import { MessageType, PeerCandidate, P2PState } from './types';

export class P2PSocket extends EventEmitter {
  private socket: dgram.Socket;
  private sessionId: number;
  private keepaliveTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private state: P2PState = P2PState.IDLE;
  localPort = 0;

  constructor() {
    super();
    this.sessionId = Math.floor(Math.random() * 0xFFFFFFFF);
    this.socket = dgram.createSocket('udp4');
    this.setupListeners();
  }

  async bind(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.socket.bind(0, () => {
        this.localPort = this.socket.address().port;
        resolve(this.localPort);
      });
      this.socket.on('error', reject);
    });
  }

  async holePunch(peer: PeerCandidate, timeout = 4000): Promise<boolean> {
    return new Promise((resolve) => {
      const start = Date.now();
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const buf = Protocol.encode(MessageType.PUNCH, this.sessionId);
        this.socket.send(buf, peer.publicPort, peer.publicIp);

        if (Date.now() - start >= timeout) {
          clearInterval(interval);
          resolve(false);
        }
      }, 200);

      const onPong = (sessId: number) => {
        if (sessId === peer.sessionId) {
          clearInterval(interval);
          this.off('pong', onPong);
          resolve(true);
        }
      };

      this.on('pong', onPong);
      if (attempts >= 20) { // safety
        clearInterval(interval);
        this.off('pong', onPong);
        resolve(false);
      }
    });
  }

  startKeepalive(targetIp: string, targetPort: number): void {
    this.stopKeepalive();
    // NAT keepalive cada 15s
    this.keepaliveTimer = setInterval(() => {
      const buf = Protocol.encode(MessageType.KEEPALIVE_PING, this.sessionId);
      this.socket.send(buf, targetPort, targetIp);
    }, 15000);

    // Heartbeat cada 5s
    this.heartbeatTimer = setInterval(() => {
      const buf = Protocol.encode(MessageType.KEEPALIVE_PING, this.sessionId);
      this.socket.send(buf, targetPort, targetIp);
    }, 5000);
  }

  stopKeepalive(): void {
    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  sendGameData(payload: Buffer, targetIp: string, targetPort: number): void {
    const buf = Protocol.encode(MessageType.GAME_DATA, this.sessionId, payload);
    this.socket.send(buf, targetPort, targetIp);
  }

  sendRaw(buf: Buffer, port: number, ip: string): void {
    this.socket.send(buf, port, ip);
  }

  private setupListeners(): void {
    this.socket.on('message', (msg, rinfo) => {
      const hdr = Protocol.decode(msg);
      if (!hdr) return;

      switch (hdr.type) {
        case MessageType.PUNCH:
          // Responder para abrir el NAT mutuo
          const ack = Protocol.encode(MessageType.KEEPALIVE_PONG, this.sessionId);
          this.socket.send(ack, rinfo.port, rinfo.address);
          this.emit('punch_received', hdr.sessionId, rinfo);
          break;

        case MessageType.KEEPALIVE_PING:
          const pong = Protocol.encode(MessageType.KEEPALIVE_PONG, this.sessionId);
          this.socket.send(pong, rinfo.port, rinfo.address);
          this.emit('heartbeat', rinfo);
          break;

        case MessageType.KEEPALIVE_PONG:
          this.emit('pong', hdr.sessionId);
          break;

        case MessageType.GAME_DATA:
          this.emit('game_data', hdr.payload, rinfo);
          break;

        case MessageType.RELAY:
          this.emit('relay_data', hdr.payload, rinfo);
          break;

        case MessageType.CLOSE:
          this.emit('peer_closed', rinfo);
          break;
      }
    });
  }

  close(): void {
    this.stopKeepalive();
    // Enviar CLOSE a todos los peers conocidos
    this.socket.close();
  }
}
```

---

## 6. Relay Manager (`UDPRelayManager.ts`)

```typescript
import dgram from 'dgram';
import { Protocol } from './Protocol';
import { MessageType, RelayPeer } from './types';

export class UDPRelayManager {
  private peers = new Map<string, RelayPeer>();
  private sessionId: number;

  constructor(sessionId: number) {
    this.sessionId = sessionId;
  }

  registerPeer(id: string, ip: string, port: number): void {
    this.peers.set(id, { id, ip, port, connectedAt: Date.now() });
  }

  removePeer(id: string): void {
    this.peers.delete(id);
  }

  hasPeer(id: string): boolean {
    return this.peers.has(id);
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  relay(senderId: string, payload: Buffer, socket: dgram.Socket): void {
    for (const [id, peer] of this.peers) {
      if (id !== senderId) {
        const relayBuf = Protocol.encode(MessageType.RELAY, this.sessionId, payload);
        socket.send(relayBuf, peer.port, peer.ip);
      }
    }
  }

  relayToAll(payload: Buffer, socket: dgram.Socket): void {
    for (const peer of this.peers.values()) {
      const relayBuf = Protocol.encode(MessageType.RELAY, this.sessionId, payload);
      socket.send(relayBuf, peer.port, peer.ip);
    }
  }

  getAllPeers(): RelayPeer[] {
    return Array.from(this.peers.values());
  }
}
```

---

## 7. Proxy Local (`LocalProxy.ts`)

```typescript
import dgram from 'dgram';

export class LocalProxy {
  private server: dgram.Socket;
  private retroPort = 55435;

  constructor(
    private onDataFromRetro: (data: Buffer) => void,
    private onError: (err: Error) => void
  ) {
    this.server = dgram.createSocket('udp4');
    this.setup();
  }

  private setup(): void {
    this.server.on('message', (msg) => {
      this.onDataFromRetro(msg);
    });
    this.server.on('error', (err) => this.onError(err));
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.bind(this.retroPort, '127.0.0.1', () => {
        console.log(`[Proxy] Escuchando en 127.0.0.1:${this.retroPort}`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  sendToRetro(data: Buffer): void {
    this.server.send(data, this.retroPort, '127.0.0.1');
  }

  close(): void {
    this.server.close();
  }
}
```

---

## 8. Orquestador (`P2PManager.ts`)

```typescript
import { NATDetector } from './NATDetector';
import { P2PSocket } from './P2PSocket';
import { UDPRelayManager } from './UDPRelayManager';
import { LocalProxy } from './LocalProxy';
import { P2PState, NATType, PeerCandidate, P2PStatus } from './types';

export class P2PManager {
  private socket: P2PSocket;
  private relay?: UDPRelayManager;
  private proxy?: LocalProxy;
  private state = P2PState.IDLE;
  private mode: 'lan' | 'direct' | 'relay' | null = null;
  private myCandidates!: PeerCandidate;
  private nakama: any; // Referencia al socket/API de Nakama

  constructor(nakamaRef: any) {
    this.socket = new P2PSocket();
    this.nakama = nakamaRef;
    this.setupListeners();
  }

  async startHost(): Promise<P2PStatus> {
    this.setState(P2PState.DISCOVERING, 10, 'Detectando red local...');
    const localIps = NATDetector.getLocalIps();
    const nat = await NATDetector.detect();

    this.setState(P2PState.DISCOVERING, 30, 'Iniciando socket P2P...');
    const port = await this.socket.bind();

    this.myCandidates = {
      peerId: this.nakama.userId,
      publicIp: nat.publicIp,
      publicPort: nat.publicPort || port,
      privateIp: localIps[0] || '127.0.0.1',
      privatePort: port,
      natType: nat.natType,
      localIps
    };

    this.relay = new UDPRelayManager(this.socket['sessionId']);

    this.setState(P2PState.SIGNALING, 50, 'Registrando sala en Nakama...');
    await this.nakama.sendMatchData({
      opCode: 101,
      data: { type: 'HOST_CANDIDATES', candidates: this.myCandidates }
    });

    this.setState(P2PState.IDLE, 100, 'Sala lista. Esperando jugadores...');
    return this.getStatus();
  }

  async connectToPeer(matchData: any): Promise<P2PStatus> {
    const hostCandidates: PeerCandidate = matchData.candidates;

    this.setState(P2PState.DISCOVERING, 10, 'Detectando red local...');
    const localIps = NATDetector.getLocalIps();
    const nat = await NATDetector.detect();
    const port = await this.socket.bind();

    this.myCandidates = {
      peerId: this.nakama.userId,
      publicIp: nat.publicIp,
      publicPort: nat.publicPort || port,
      privateIp: localIps[0] || '127.0.0.1',
      privatePort: port,
      natType: nat.natType,
      localIps
    };

    // Enviar candidatos al host
    await this.nakama.sendMatchData({
      opCode: 101,
      data: { type: 'GUEST_CANDIDATES', candidates: this.myCandidates }
    });

    // 1) Intentar LAN
    this.setState(P2PState.LAN_CHECK, 30, 'Verificando conexión local...');
    const sameSubnet = NATDetector.isSameSubnet(
      localIps[0] || '',
      hostCandidates.privateIp
    );

    if (sameSubnet) {
      const lanOk = await this.tryLanConnect(hostCandidates.privateIp, hostCandidates.privatePort);
      if (lanOk) {
        this.mode = 'lan';
        this.setState(P2PState.LAN_CONNECTED, 60, 'Conectado por red local');
        return this.startGame(hostCandidates);
      }
    }

    // 2) Intentar Hole Punching
    this.setState(P2PState.PUNCHING, 60, 'Perforando NAT...');
    const punched = await this.socket.holePunch(hostCandidates);

    if (punched) {
      this.mode = 'direct';
      this.setState(P2PState.DIRECT_CONNECTED, 80, 'Conexión P2P directa establecida');
      this.socket.startKeepalive(hostCandidates.publicIp, hostCandidates.publicPort);
      return this.startGame(hostCandidates);
    }

    // 3) Fallback a relay
    this.mode = 'relay';
    this.setState(P2PState.RELAY_CONNECTED, 80, 'Usando relay del host (NAT restrictivo)');
    this.socket.startKeepalive(hostCandidates.publicIp, hostCandidates.publicPort);
    return this.startGame(hostCandidates);
  }

  private async tryLanConnect(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000);
      const pingBuf = Buffer.alloc(8);
      pingBuf.write('EMPING!');
      this.socket['socket'].send(pingBuf, port, ip, () => {
        this.socket['socket'].once('message', (msg) => {
          if (msg.toString() === 'EMPONG!') {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      });
    });
  }

  private async startGame(peer: PeerCandidate): Promise<P2PStatus> {
    this.setState(P2PState.GAME_RUNNING, 95, 'Lanzando RetroArch...');
    // Aquí se lanza RetroArch con --connect 127.0.0.1 --port 55435
    return this.getStatus();
  }

  stop(): void {
    this.socket.close();
    this.proxy?.close();
    this.state = P2PState.IDLE;
    this.mode = null;
  }

  getStatus(): P2PStatus {
    return {
      state: this.state,
      progress: this.getProgressForState(this.state),
      message: '',
      mode: this.mode
    };
  }

  private setState(state: P2PState, progress: number, message: string): void {
    this.state = state;
    this.emitStatus({ state, progress, message, mode: this.mode });
  }

  private emitStatus(status: P2PStatus): void {
    // Enviar evento IPC a la ventana
    if (globalThis.window?.electron?.ipcRenderer) {
      globalThis.window.electron.ipcRenderer.send('p2p:state-changed', status);
    }
  }

  private getProgressForState(s: P2PState): number {
    const map: Record<P2PState, number> = {
      [P2PState.IDLE]: 0,
      [P2PState.DISCOVERING]: 15,
      [P2PState.SIGNALING]: 35,
      [P2PState.LAN_CHECK]: 45,
      [P2PState.LAN_CONNECTED]: 60,
      [P2PState.PUNCHING]: 60,
      [P2PState.DIRECT_CONNECTED]: 80,
      [P2PState.RELAY_CONNECTED]: 80,
      [P2PState.GAME_RUNNING]: 100,
      [P2PState.FAILED]: 0
    };
    return map[s] ?? 0;
  }

  private setupListeners(): void {
    this.socket.on('game_data', (payload: Buffer) => {
      if (this.mode === 'relay' && this.relay) {
        // Si estamos en modo host (relay), reenviar
        this.proxy?.sendToRetro(payload);
      }
    });
  }
}
```

---

## 9. Integración IPC (`index.ts`)

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { P2PManager } from './P2PManager';

let p2p: P2PManager | null = null;

export function setupP2PHandlers(nakamaRef: any, mainWindow: BrowserWindow) {
  p2p = new P2PManager(nakamaRef);

  ipcMain.handle('p2p:start', async () => {
    return await p2p.startHost();
  });

  ipcMain.handle('p2p:connect', async (_, matchData) => {
    return await p2p.connectToPeer(matchData);
  });

  ipcMain.handle('p2p:stop', async () => {
    p2p?.stop();
    return { success: true };
  });

  ipcMain.handle('p2p:getStatus', async () => {
    return p2p?.getStatus() ?? { state: 'IDLE', progress: 0, message: '', mode: null };
  });

  // Reenviar eventos P2P a la ventana
  mainWindow.webContents.on('p2p:state-changed', (_, status) => {
    mainWindow.webContents.send('p2p:state-changed', status);
  });
}
```
