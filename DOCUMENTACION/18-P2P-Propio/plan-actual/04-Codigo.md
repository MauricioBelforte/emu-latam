# 04 - Especificación de Código (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Versión:** 1.1

---

## 1. Types Compartidos (`protocol/types.ts`)

```typescript
export type NatType = 'cone' | 'symmetric';

export type PeerRole = 'host' | 'guest';

export type PeerState =
  | 'idle' | 'discovering' | 'signaling' | 'lan_check'
  | 'lan_connected' | 'punching' | 'direct_connected'
  | 'relay_connected' | 'game_running' | 'disconnected' | 'failed';

export enum PacketType {
  PUNCH = 0x01,
  PUNCH_ACK = 0x02,
  KEEPALIVE = 0x03,
  KEEPALIVE_ACK = 0x04,
  RELAY_DATA = 0x05,
  DISCONNECT = 0x06,
}

export interface PeerCandidate {
  peerId: string;
  publicIp: string;
  publicPort: number;
  privateIps: string[];
  natType: NatType;
  protocolVersion: number;
}

export interface NatResult {
  publicIp: string;
  publicPort: number;
  natType: NatType;
}

export interface DecodedPacket {
  version: number;
  type: PacketType;
  sessionToken: number;
  payload: Buffer;
}

export interface GuestRoute {
  peerId: string;
  remoteAddr: string;
  remotePort: number;
  localForwardSocket: import('dgram').Socket;
  lastSeen: number;
}

export interface P2PConfig {
  role: PeerRole;
  localPeerId: string;
  roomId: string;
  signaling: SignalingChannel;
}

export interface P2PStatus {
  state: PeerState;
  progress: number;
  message: string;
  mode: 'lan' | 'direct' | 'relay' | null;
}

export const PROTOCOL_VERSION = 1;
export const RETROARCH_PORT = 55435;
export const KEEPALIVE_INTERVAL = 18000;    // 18s
export const KEEPALIVE_MAX_MISSED = 3;       // ~54s total
```

---

## 2. Protocolo Binario (`protocol/packet.ts`)

```typescript
import { PacketType, DecodedPacket, PROTOCOL_VERSION } from './types';

const HEADER_SIZE = 4; // version(1) + type(1) + sessionToken(2)

export function encodePacket(
  type: PacketType,
  sessionToken: number,
  payload?: Buffer,
  version = PROTOCOL_VERSION,
): Buffer {
  const data = payload ?? Buffer.alloc(0);
  const buf = Buffer.alloc(HEADER_SIZE + data.length);
  buf.writeUInt8(version, 0);
  buf.writeUInt8(type, 1);
  buf.writeUInt16BE(sessionToken, 2);
  data.copy(buf, HEADER_SIZE);
  return buf;
}

export function decodePacket(buf: Buffer): DecodedPacket | null {
  if (buf.length < HEADER_SIZE) return null;
  return {
    version: buf.readUInt8(0),
    type: buf.readUInt8(1) as PacketType,
    sessionToken: buf.readUInt16BE(2),
    payload: buf.subarray(HEADER_SIZE),
  };
}
```

---

## 3. Detector NAT (`NatDetector.ts`)

```typescript
import { NatResult, NatType } from './protocol/types';

const STUN_SERVERS = [
  { host: 'stun.l.google.com', port: 19302 },
  { host: 'stun1.l.google.com', port: 19302 },
];

async function stunBindingRequest(
  transport: UDPTransport,
  server: { host: string; port: number },
): Promise<{ address: string; port: number } | null> {
  try {
    const response = await transport.sendStunRequest(server, {
      timeoutMs: 1500,
      retries: 2,
    });
    return { address: response.address, port: response.port };
  } catch {
    return null;
  }
}

export async function detectNATType(transport: UDPTransport): Promise<NatResult> {
  const [r1, r2] = await Promise.all([
    stunBindingRequest(transport, STUN_SERVERS[0]),
    stunBindingRequest(transport, STUN_SERVERS[1]),
  ]);

  if (!r1 || !r2) {
    return { publicIp: r1?.address ?? '', publicPort: r1?.port ?? 0, natType: 'symmetric' };
  }

  const natType: NatType = r1.port === r2.port ? 'cone' : 'symmetric';
  return { publicIp: r1.address, publicPort: r1.port, natType };
}
```

---

## 4. Socket P2P (`HolePuncher.ts`)

```typescript
import { encodePacket, decodePacket } from './protocol/packet';
import { PacketType, PeerCandidate } from './protocol/types';

export async function doHolePunch(
  transport: UDPTransport,
  localCandidate: PeerCandidate,
  remoteCandidate: PeerCandidate,
  sessionToken: number,
): Promise<boolean> {
  // Symmetric-Symmetric: no intentar
  if (localCandidate.natType === 'symmetric' && remoteCandidate.natType === 'symmetric') {
    return false;
  }

  const ATTEMPTS = [
    { delay: 0, timeout: 400 },
    { delay: 400, timeout: 800 },
    { delay: 1200, timeout: 1600 },
  ]; // ~2.8s total

  for (const attempt of ATTEMPTS) {
    await new Promise((r) => setTimeout(r, attempt.delay));
    transport.send(
      encodePacket(PacketType.PUNCH, sessionToken),
      remoteCandidate.publicPort,
      remoteCandidate.publicIp,
    );

    const ack = await transport.waitFor(
      (pkt, rinfo) =>
        pkt.type === PacketType.PUNCH_ACK &&
        rinfo.address === remoteCandidate.publicIp,
      attempt.timeout,
    );

    if (ack) {
      transport.send(
        encodePacket(PacketType.PUNCH_ACK, sessionToken),
        remoteCandidate.publicPort,
        remoteCandidate.publicIp,
      );
      return true;
    }
  }

  return false;
}
```

---

## 5. Relay Server (`RelayServer.ts`)

Cada guest tiene su propio socket local dedicado hacia RetroArch:

```typescript
import dgram from 'dgram';
import { encodePacket, decodePacket } from './protocol/packet';
import { PacketType, GuestRoute, RETROARCH_PORT } from './protocol/types';

export class RelayServer {
  private routes = new Map<string, GuestRoute>();
  private tokensByPeer = new Map<string, number>();
  private peerIdByToken = new Map<number, string>();

  constructor(private transport: UDPTransport) {
    transport.onMessage((data, rinfo) => this.handleIncoming(data, rinfo));
  }

  registerAuthorizedPeer(peerId: string, sessionToken: number) {
    this.tokensByPeer.set(peerId, sessionToken);
    this.peerIdByToken.set(sessionToken, peerId);
  }

  private async handleIncoming(
    data: Buffer,
    rinfo: { address: string; port: number },
  ) {
    const packet = decodePacket(data);
    if (!packet || packet.type !== PacketType.RELAY_DATA) return;

    const peerId = this.peerIdByToken.get(packet.sessionToken);
    if (!peerId) return;

    let route = this.routes.get(peerId);
    if (!route) {
      route = await this.createRoute(peerId, rinfo);
      this.routes.set(peerId, route);
    }

    route.lastSeen = Date.now();
    route.remoteAddr = rinfo.address;
    route.remotePort = rinfo.port;
    route.localForwardSocket.send(packet.payload, RETROARCH_PORT, '127.0.0.1');
  }

  private async createRoute(
    peerId: string,
    rinfo: { address: string; port: number },
  ): Promise<GuestRoute> {
    const localSocket = dgram.createSocket('udp4');
    await new Promise<void>((resolve) => localSocket.bind(0, '127.0.0.1', () => resolve()));

    const token = this.tokensByPeer.get(peerId)!;
    localSocket.on('message', (reply) => {
      const wrapped = encodePacket(PacketType.RELAY_DATA, token, reply);
      this.transport.send(wrapped, rinfo.port, rinfo.address);
    });

    return {
      peerId,
      remoteAddr: rinfo.address,
      remotePort: rinfo.port,
      localForwardSocket: localSocket,
      lastSeen: Date.now(),
    };
  }

  removeRoute(peerId: string) {
    this.routes.get(peerId)?.localForwardSocket.close();
    this.routes.delete(peerId);
    const token = this.tokensByPeer.get(peerId);
    if (token) this.peerIdByToken.delete(token);
    this.tokensByPeer.delete(peerId);
  }

  removeAll() {
    for (const id of this.routes.keys()) this.removeRoute(id);
  }
}
```

---

## 6. Keepalive Service (`KeepAliveService.ts`)

```typescript
import { encodePacket } from './protocol/packet';
import { PacketType, KEEPALIVE_INTERVAL, KEEPALIVE_MAX_MISSED } from './protocol/types';

export class KeepAliveService {
  private timers = new Map<string, NodeJS.Timeout>();
  private missed = new Map<string, number>();

  start(
    peerId: string,
    sendTo: (buf: Buffer) => void,
    sessionToken: number,
    onTimeout: (peerId: string) => void,
  ) {
    this.missed.set(peerId, 0);

    const timer = setInterval(() => {
      const m = this.missed.get(peerId) ?? 0;
      if (m >= KEEPALIVE_MAX_MISSED) {
        this.stop(peerId);
        onTimeout(peerId);
        return;
      }
      sendTo(encodePacket(PacketType.KEEPALIVE, sessionToken));
      this.missed.set(peerId, m + 1);
    }, KEEPALIVE_INTERVAL);

    this.timers.set(peerId, timer);
  }

  onAckReceived(peerId: string) {
    this.missed.set(peerId, 0);
  }

  stop(peerId: string) {
    clearInterval(this.timers.get(peerId));
    this.timers.delete(peerId);
    this.missed.delete(peerId);
  }

  stopAll() {
    for (const id of this.timers.keys()) this.stop(id);
  }
}
```

---

## 7. Orquestador (`P2PManager.ts`)

```typescript
export class P2PManager {
  private transport!: UDPTransport;
  private relay?: RelayServer;
  private keepalive = new KeepAliveService();
  private state = new StateMachine();
  private mode: 'lan' | 'direct' | 'relay' | null = null;
  private connections = new Map<string, PeerConnection>();

  constructor(
    private nakama: SignalingChannel,
    private emitToUI: (status: P2PStatus) => void,
  ) {}

  async startAsHost(roomId: string): Promise<P2PStatus> {
    this.state.transition('discovering');
    this.transport = await UDPTransport.create();

    const nat = await detectNATType(this.transport);
    const candidate: PeerCandidate = {
      peerId: this.nakama.localPeerId,
      publicIp: nat.publicIp,
      publicPort: nat.publicPort,
      privateIps: NATDetector.getLocalIps(),
      natType: nat.natType,
      protocolVersion: PROTOCOL_VERSION,
    };

    await this.nakama.publishCandidate(candidate);
    this.relay = new RelayServer(this.transport);

    this.state.transition('signaling');
    this.emitStatus(100, 'SALA LISTA');
    return this.getStatus();
  }

  async joinAsGuest(roomId: string): Promise<P2PStatus> {
    this.state.transition('discovering');
    this.transport = await UDPTransport.create();
    const nat = await detectNATType(this.transport);

    const myCandidate: PeerCandidate = {
      peerId: this.nakama.localPeerId,
      publicIp: nat.publicIp,
      publicPort: nat.publicPort,
      privateIps: NATDetector.getLocalIps(),
      natType: nat.natType,
      protocolVersion: PROTOCOL_VERSION,
    };
    await this.nakama.publishCandidate(myCandidate);

    const hostCandidate = await this.nakama.waitForCandidate();

    // LAN check
    if (hostCandidate.publicIp === nat.publicIp) {
      const lanOk = await this.tryLan(hostCandidate);
      if (lanOk) return this.connectDone('lan', hostCandidate);
    }

    // Hole punch
    this.state.transition('punching');
    const sessionToken = Math.floor(Math.random() * 65535);
    const punched = await doHolePunch(this.transport, myCandidate, hostCandidate, sessionToken);

    if (punched) {
      return this.connectDone('direct', hostCandidate, sessionToken);
    }

    // Relay fallback
    await this.nakama.publishReady(hostCandidate.peerId, sessionToken);
    this.relay?.registerAuthorizedPeer(hostCandidate.peerId, sessionToken);
    return this.connectDone('relay', hostCandidate, sessionToken);
  }

  private async connectDone(
    mode: 'lan' | 'direct' | 'relay',
    peer: PeerCandidate,
    token?: number,
  ): Promise<P2PStatus> {
    this.mode = mode;
    this.state.transition(mode === 'relay' ? 'relay_connected' : 'direct_connected');

    if (mode !== 'lan' && token) {
      this.keepalive.start(
        peer.peerId,
        (buf) => this.transport.send(buf, peer.publicPort, peer.publicIp),
        token,
        (id) => this.handleDisconnect(id),
      );
    }

    this.state.transition('game_running');
    return this.getStatus();
  }

  private emitStatus(progress: number, message: string) {
    this.emitToUI({
      state: this.state.current,
      progress,
      message,
      mode: this.mode,
    });
  }

  private getStatus(): P2PStatus {
    return {
      state: this.state.current,
      progress: 0,
      message: '',
      mode: this.mode,
    };
  }

  private handleDisconnect(peerId: string) {
    this.keepalive.stop(peerId);
    this.relay?.removeRoute(peerId);
    this.state.transition('disconnected');
    this.emitToUI({ state: 'disconnected', progress: 0, message: 'Peer desconectado', mode: this.mode });
  }

  cancel() {
    this.keepalive.stopAll();
    this.relay?.removeAll();
    this.transport?.close();
    this.state.transition('idle');
  }
}
```

---

## 8. IPC Handlers (`ipc/handlers.ts`)

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { P2PManager } from '../P2PManager';

export function registerP2PHandlers(ipcMain: IpcMain, ctx: AppContext) {
  const manager = new P2PManager(ctx.nakamaClient, (status) => {
    ctx.mainWindow.webContents.send('p2p:status', status);
  });

  ipcMain.handle('p2p:host-start', (_, { roomId }) => manager.startAsHost(roomId));
  ipcMain.handle('p2p:guest-join', (_, { roomId }) => manager.joinAsGuest(roomId));
  ipcMain.handle('p2p:cancel', () => { manager.cancel(); return { success: true }; });
}
```

---

## 9. Integración con Sistema Existente

Tal como el plan-inicial: `SignalingChannel` recibe la sesión Nakama ya abierta, no abre conexión nueva. React llama via `window.electron.invoke('p2p:host-start')`.
