# 04 — Especificación de Código: Sistema P2P Propio para Emu Latam

> **Módulo:** 18-P2P-Propio · **Documento:** 4/5 · **Fecha:** 2026-07-23
> **Ver también:** [01-Requerimientos.md](./01-Requerimientos.md) · [02-Analisis.md](./02-Analisis.md) · [03-Diseno.md](./03-Diseno.md) · [05-Checklist.md](./05-Checklist.md)

---

## 1. Resumen

Este documento traduce la arquitectura de [03-Diseno.md](./03-Diseno.md) a estructura de archivos, tipos de TypeScript y **esqueletos/pseudocódigo** de las funciones clave. No es código de producción probado — es la guía suficientemente concreta como para que un desarrollador complete la implementación siguiendo el mismo camino de diseño.

---

## 2. Estructura de archivos y carpetas propuesta

```
src/main/p2p/
├── index.ts                    # exporta P2PManager, punto de entrada del módulo
├── P2PManager.ts                # orquestador (startP2PService, connectToPeer, shutdown)
├── NatDetector.ts                # detectNATType()
├── HolePuncher.ts                # doHolePunch()
├── RelayServer.ts                # startRelay() / clase RelayServer
├── KeepAliveService.ts           # keepAlive()
├── PortAllocator.ts              # bind(0) + lectura de puerto asignado
├── LoopbackProxy.ts              # sockets 127.0.0.1 hacia/desde RetroArch
├── SignalingChannel.ts           # wrapper sobre el match de Nakama existente
├── StateMachine.ts               # máquina de estados por conexión (ver 03-Diseno.md §8)
├── protocol/
│   ├── packet.ts                 # encode/decode del header binario
│   └── types.ts                  # tipos e interfaces compartidos
├── ipc/
│   └── handlers.ts               # registerP2PHandlers(ipcMain, manager)
└── __tests__/
    ├── protocol/packet.test.ts
    ├── NatDetector.test.ts
    ├── HolePuncher.test.ts
    ├── PortAllocator.test.ts
    └── RelayServer.test.ts
```

---

## 3. Interfaces y types principales

```typescript
// protocol/types.ts

export type NatType =
  | 'full_cone'        // trato práctico: incluye Full/Restricted/Port-Restricted Cone (ver §4.4)
  | 'symmetric';

export type PeerRole = 'host' | 'guest';

export type PeerState =
  | 'idle'
  | 'signaling'
  | 'nat_detecting'
  | 'candidate_exchange'
  | 'punching'
  | 'connected_direct'
  | 'connected_direct_lan'
  | 'connected_relay'
  | 'disconnected'
  | 'failed';

export interface PeerCandidate {
  peerId: string;
  publicIp: string;
  publicPort: number;
  privateIps: string[];
  natType: NatType;
  protocolVersion: number;
}

export interface NatDetectionResult {
  publicIp: string;
  publicPort: number;
  natType: NatType;
}

export enum PacketType {
  PUNCH = 0x01,
  PUNCH_ACK = 0x02,
  KEEPALIVE = 0x03,
  KEEPALIVE_ACK = 0x04,
  RELAY_DATA = 0x05,
  DISCONNECT = 0x06,
}

export interface DecodedPacket {
  version: number;
  type: PacketType;
  sessionToken: number;
  payload: Buffer;
}

export interface P2PConfig {
  role: PeerRole;
  localPeerId: string;
  roomId: string;
  signaling: SignalingChannel;
}

export interface PeerConnection {
  peerId: string;
  state: PeerState;
  sessionToken: number;
  loopbackProxy: LoopbackProxy;
}

export interface GuestRoute {
  peerId: string;
  remoteAddr: string;
  remotePort: number;
  localForwardSocket: import('dgram').Socket;
  lastSeen: number;
}

export const PROTOCOL_VERSION = 1;
export const RETROARCH_PORT = 55435;
```

`protocol/packet.ts` (encode/decode, sin dependencias de red — es la pieza más fácil de testear al 100%):

```typescript
// protocol/packet.ts
import { PacketType, DecodedPacket, PROTOCOL_VERSION } from './types';

const HEADER_SIZE = 4; // version(1) + type(1) + sessionToken(2)

export function encodePacket(input: {
  type: PacketType;
  sessionToken: number;
  payload?: Buffer;
  version?: number;
}): Buffer {
  const payload = input.payload ?? Buffer.alloc(0);
  const buf = Buffer.alloc(HEADER_SIZE + payload.length);
  buf.writeUInt8(input.version ?? PROTOCOL_VERSION, 0);
  buf.writeUInt8(input.type, 1);
  buf.writeUInt16BE(input.sessionToken, 2);
  payload.copy(buf, HEADER_SIZE);
  return buf;
}

export function decodePacket(buf: Buffer): DecodedPacket | null {
  if (buf.length < HEADER_SIZE) return null; // ruido de internet, se descarta
  return {
    version: buf.readUInt8(0),
    type: buf.readUInt8(1),
    sessionToken: buf.readUInt16BE(2),
    payload: buf.subarray(HEADER_SIZE),
  };
}
```

Ejemplo de test (patrón para el resto de `__tests__/`):

```typescript
// __tests__/protocol/packet.test.ts
import { describe, it, expect } from 'vitest';
import { encodePacket, decodePacket } from '../../protocol/packet';
import { PacketType } from '../../protocol/types';

describe('packet encode/decode', () => {
  it('hace round-trip sin pérdida de datos', () => {
    const original = encodePacket({
      type: PacketType.RELAY_DATA,
      sessionToken: 4242,
      payload: Buffer.from([1, 2, 3, 4]),
    });
    const decoded = decodePacket(original);
    expect(decoded?.type).toBe(PacketType.RELAY_DATA);
    expect(decoded?.sessionToken).toBe(4242);
    expect(decoded?.payload).toEqual(Buffer.from([1, 2, 3, 4]));
  });

  it('descarta paquetes más cortos que el header', () => {
    expect(decodePacket(Buffer.from([1, 2]))).toBeNull();
  });
});
```

---

## 4. Pseudocódigo de las funciones clave

### 4.1 `startP2PService()`

```typescript
async function startP2PService(config: P2PConfig): Promise<P2PServiceHandle> {
  // 1. Reservar el socket externo (puerto dinámico, ver 03-Diseno.md §9)
  const transport = await UDPTransport.create(); // bind(0) internamente

  // 2. Detectar NAT propio
  const natResult = await detectNATType(transport);

  // 3. Publicar candidatos propios vía Nakama (opcode 100, ver 03-Diseno.md §7.1)
  const candidate: PeerCandidate = {
    peerId: config.localPeerId,
    publicIp: natResult.publicIp,
    publicPort: natResult.publicPort,
    privateIps: listLocalPrivateIps(),
    natType: natResult.natType,
    protocolVersion: PROTOCOL_VERSION,
  };
  await config.signaling.publishCandidate(candidate);

  // 4. Sólo el host arranca el RelayServer (queda pasivo hasta que haya guests)
  const relay = config.role === 'host' ? new RelayServer(transport, config.signaling) : null;

  // 5. KeepAliveService arranca en espera (sin peers todavía)
  const keepAlive = new KeepAliveService();

  // 6. Suscribirse a candidatos entrantes de otros peers
  const unsubscribe = config.signaling.onCandidate((remoteCandidate) => {
    void connectToPeer(remoteCandidate, { transport, relay, keepAlive, candidate, config });
  });

  return {
    transport,
    relay,
    keepAlive,
    stop: async () => {
      unsubscribe();
      relay?.dispose();
      keepAlive.stopAll();
      await transport.close();
    },
  };
}
```

### 4.2 `doHolePunch(peerInfo)`

```typescript
async function doHolePunch(
  transport: UDPTransport,
  localCandidate: PeerCandidate,
  remoteCandidate: PeerCandidate,
  sessionToken: number,
): Promise<'success' | 'failed'> {
  // Symmetric-Symmetric: no vale la pena intentar (ver 02-Analisis.md §2.4)
  if (localCandidate.natType === 'symmetric' && remoteCandidate.natType === 'symmetric') {
    return 'failed';
  }

  const MAX_ATTEMPTS = 3;
  const BASE_BACKOFF_MS = 400;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    transport.send(
      encodePacket({ type: PacketType.PUNCH, sessionToken }),
      remoteCandidate.publicPort,
      remoteCandidate.publicIp,
    );

    const gotAck = await transport.waitFor(
      (pkt, rinfo) => pkt.type === PacketType.PUNCH_ACK && rinfo.address === remoteCandidate.publicIp,
      BASE_BACKOFF_MS * 2 ** attempt, // backoff: 400ms, 800ms, 1600ms (~2.8s total)
    );

    if (gotAck) {
      // devolver el ACK por si el otro lado todavía no vio el nuestro
      transport.send(
        encodePacket({ type: PacketType.PUNCH_ACK, sessionToken }),
        remoteCandidate.publicPort,
        remoteCandidate.publicIp,
      );
      return 'success';
    }
  }

  return 'failed'; // dispara la rama de relay en connectToPeer()
}
```

### 4.3 `startRelay(connections)` — `RelayServer`

Responde la pregunta #3 del brief: cómo no mezclar paquetes de distintos guests. La clave es que cada guest tiene **su propio socket local** hacia RetroArch — RetroArch ve N "clientes" distintos aunque todos vengan del mismo `RelayServer` (ver [02-Analisis.md §2.5](./02-Analisis.md#25-topología-real-de-retroarch-netplay-por-qué-esto-simplifica-todo)).

```typescript
class RelayServer {
  private routes = new Map<string, GuestRoute>();       // key: peerId
  private tokensByPeer = new Map<string, number>();      // sessionToken asignado por peer
  private peerIdByToken = new Map<number, string>();      // índice inverso, lookup O(1)

  constructor(private transport: UDPTransport, private signaling: SignalingChannel) {
    transport.onMessage((data, rinfo) => this.handleIncoming(data, rinfo));
  }

  // Llamado cuando Nakama confirma que este peer pertenece a la sala activa
  // (mitigación de abuso de relay, ver 02-Analisis.md §5)
  registerAuthorizedPeer(peerId: string, sessionToken: number) {
    this.tokensByPeer.set(peerId, sessionToken);
    this.peerIdByToken.set(sessionToken, peerId);
  }

  private async handleIncoming(data: Buffer, rinfo: { address: string; port: number }) {
    const packet = decodePacket(data);
    if (!packet || packet.type !== PacketType.RELAY_DATA) return;

    const peerId = this.peerIdByToken.get(packet.sessionToken);
    if (!peerId) return; // token no registrado -> se descarta en silencio

    let route = this.routes.get(peerId);
    if (!route) {
      route = await this.createRoute(peerId, rinfo);
      this.routes.set(peerId, route);
    }
    route.lastSeen = Date.now();
    route.remoteAddr = rinfo.address; // por si cambió de puerto (router reasignó mapping)
    route.remotePort = rinfo.port;

    // Reenvío transparente: no se parsea ni modifica el payload de RetroArch
    route.localForwardSocket.send(packet.payload, RETROARCH_PORT, '127.0.0.1');
  }

  private async createRoute(peerId: string, rinfo: { address: string; port: number }): Promise<GuestRoute> {
    const localForwardSocket = await PortAllocator.bindLocal(); // bind(0) en 127.0.0.1

    localForwardSocket.on('message', (reply) => {
      const token = this.tokensByPeer.get(peerId)!;
      const wrapped = encodePacket({ type: PacketType.RELAY_DATA, sessionToken: token, payload: reply });
      this.transport.send(wrapped, rinfo.port, rinfo.address);
    });

    return { peerId, remoteAddr: rinfo.address, remotePort: rinfo.port, localForwardSocket, lastSeen: Date.now() };
  }

  removeRoute(peerId: string) {
    this.routes.get(peerId)?.localForwardSocket.close();
    this.routes.delete(peerId);
    const token = this.tokensByPeer.get(peerId);
    if (token) this.peerIdByToken.delete(token);
    this.tokensByPeer.delete(peerId);
  }

  dispose() {
    for (const peerId of this.routes.keys()) this.removeRoute(peerId);
  }
}
```

### 4.4 `detectNATType()`

> **Nota honesta de implementación:** distinguir formalmente Full Cone / Restricted Cone / Port-Restricted Cone (tal como pide RF-04 en [01-Requerimientos.md](./01-Requerimientos.md)) requiere que el servidor STUN responda desde una IP **y** puerto distintos a los que recibió la consulta (mecanismo `CHANGE-REQUEST` de RFC 3489). La mayoría de los STUN públicos actuales implementan RFC 5389/8489, que no exige soportar eso. Por eso, a nivel de implementación, el MVP clasifica en sólo dos baldes prácticos — **Cone** (cualquier variante) vs. **Symmetric** — que es exactamente lo que necesita el árbol de decisión de conexión (ver [02-Analisis.md §2.4](./02-Analisis.md#24-nota-técnica-hole-punching-cuando-sólo-un-lado-es-simétrico)). La sub-clasificación fina de Cone queda como mejora opcional de telemetría (Fase 3, [05-Checklist.md](./05-Checklist.md)), sólo si en el futuro se agrega un STUN propio con soporte de `CHANGE-REQUEST`.

```typescript
const STUN_SERVERS: Array<{ host: string; port: number }> = [
  { host: 'stun.l.google.com', port: 19302 },
  { host: 'stun1.l.google.com', port: 19302 },
];

async function detectNATType(transport: UDPTransport): Promise<NatDetectionResult> {
  const [resultA, resultB] = await Promise.all([
    stunBindingRequest(transport, STUN_SERVERS[0]),
    stunBindingRequest(transport, STUN_SERVERS[1]),
  ]);

  if (!resultA || !resultB) {
    // Sin conectividad UDP saliente verificable: se asume el peor caso
    // (symmetric) para forzar el fallback a relay en vez de perder tiempo
    // intentando un punching que probablemente falle igual.
    return { publicIp: resultA?.address ?? '', publicPort: resultA?.port ?? 0, natType: 'symmetric' };
  }

  const samePort = resultA.port === resultB.port;
  return {
    publicIp: resultA.address,
    publicPort: resultA.port,
    natType: samePort ? 'full_cone' : 'symmetric',
  };
}

// Usa la librería `stun` (nodertc/stun, ver 02-Analisis.md §3.3) sobre el
// mismo socket dgram que ya administra UDPTransport.
async function stunBindingRequest(
  transport: UDPTransport,
  server: { host: string; port: number },
): Promise<{ address: string; port: number } | null> {
  try {
    const response = await transport.sendStunRequest(server, { timeoutMs: 1500, retries: 2 });
    return { address: response.address, port: response.port };
  } catch {
    return null; // timeout o servidor inalcanzable
  }
}
```

### 4.5 `keepAlive()`

```typescript
class KeepAliveService {
  private timers = new Map<string, NodeJS.Timeout>();
  private missedAcks = new Map<string, number>();

  private readonly INTERVAL_MS = 18_000; // dentro de la ventana 15-20s (RF-10)
  private readonly MAX_MISSED = 3;        // ~54s antes de declarar desconexión

  start(peerId: string, sendTo: (packet: Buffer) => void, sessionToken: number, onTimeout: (peerId: string) => void) {
    this.missedAcks.set(peerId, 0);

    const timer = setInterval(() => {
      const missed = this.missedAcks.get(peerId) ?? 0;
      if (missed >= this.MAX_MISSED) {
        this.stop(peerId);
        onTimeout(peerId); // -> handlePeerDisconnect(peerId, ctx, 'timeout')
        return;
      }
      sendTo(encodePacket({ type: PacketType.KEEPALIVE, sessionToken }));
      this.missedAcks.set(peerId, missed + 1); // se resetea en onAckReceived()
    }, this.INTERVAL_MS);

    this.timers.set(peerId, timer);
  }

  onAckReceived(peerId: string) {
    this.missedAcks.set(peerId, 0);
  }

  stop(peerId: string) {
    const timer = this.timers.get(peerId);
    if (timer) clearInterval(timer);
    this.timers.delete(peerId);
    this.missedAcks.delete(peerId);
  }

  stopAll() {
    for (const peerId of this.timers.keys()) this.stop(peerId);
  }
}
```

### 4.6 `handlePeerDisconnect()`

```typescript
function handlePeerDisconnect(
  peerId: string,
  ctx: P2PContext,
  reason: 'timeout' | 'explicit' | 'error',
) {
  const conn = ctx.connections.get(peerId);
  if (!conn) return; // ya se había limpiado, evita doble liberación

  conn.stateMachine.transition('disconnected');

  ctx.keepAlive.stop(peerId);

  if (ctx.role === 'host') {
    ctx.relay?.removeRoute(peerId); // libera el socket local dedicado (ver §4.3)
  } else {
    conn.loopbackProxy.close();
  }

  void ctx.signaling.publishBye(peerId, reason); // opcode 103, ver 03-Diseno.md §7.1
  ctx.connections.delete(peerId);

  ctx.emitToRenderer('p2p:status', { peerId, state: 'disconnected', detail: reason });
  ctx.emitToRenderer('p2p:peer-list', { peers: ctx.listPeerSummaries() });
}
```

---

## 5. Integración con el sistema existente

### 5.1 Dónde se agrega en el main process

En el mismo archivo donde hoy se registran los handlers de Tailscale (p. ej. `main/ipc/index.ts`), se agrega el registro del nuevo módulo al lado de los existentes:

```typescript
// main/ipc/index.ts
import { registerTailscaleHandlers } from './tailscale'; // existente
import { registerBoreHandlers } from './bore';             // existente
import { registerP2PHandlers } from '../p2p/ipc/handlers';  // nuevo

export function registerAllHandlers(ipcMain: IpcMain, ctx: AppContext) {
  registerTailscaleHandlers(ipcMain, ctx);
  registerBoreHandlers(ipcMain, ctx);
  registerP2PHandlers(ipcMain, ctx); // reutiliza ctx.nakamaClient, no crea nada nuevo
}
```

```typescript
// main/p2p/ipc/handlers.ts
export function registerP2PHandlers(ipcMain: IpcMain, ctx: AppContext) {
  const manager = new P2PManager(ctx.nakamaClient, ctx.mainWindow);

  ipcMain.handle('p2p:host-start', (_e, { roomId }) => manager.startAsHost(roomId));
  ipcMain.handle('p2p:guest-join', (_e, { roomId }) => manager.joinAsGuest(roomId));
  ipcMain.handle('p2p:cancel', (_e, { roomId }) => manager.cancel(roomId));
  ipcMain.handle('p2p:disconnect', (_e, { peerId }) => manager.disconnect(peerId));

  app.on('before-quit', () => manager.shutdownAll()); // ver 03-Diseno.md §9 (liberación de puertos)
}
```

### 5.2 Cómo se llama desde React

Mismo patrón que ya usa el proyecto para Tailscale (vía `contextBridge`/`preload`), sólo cambia el nombre de canal invocado:

```typescript
// Antes:  await window.electron.invoke('tailscale-guest', { roomId });
// Ahora:  await window.electron.invoke('p2p:guest-join', { roomId });

window.electron.on('p2p:status', ({ peerId, state, detail }) => {
  // alimenta el mismo componente de spinner/estado que ya existe,
  // mapeando PeerState -> mensaje visible (ver 03-Diseno.md §8)
});
```

Tabla de migración directa para quien toque el botón "RETAR":

| Antes (Tailscale/Bore) | Ahora (P2P propio) |
|---|---|
| IPC `tailscale-host` / `bore-host` | IPC `p2p:host-start` |
| IPC `tailscale-guest` / `bore-guest` | IPC `p2p:guest-join` |
| Proceso externo (Tailscale daemon / túnel bore) corriendo aparte | Ningún proceso externo — todo vive dentro del main process de Electron |
| `launch-game` apunta a la IP de la VPN de Tailscale | `launch-game` apunta a `127.0.0.1:<puerto del LoopbackProxy>` (ver 03-Diseno.md §3) |

### 5.3 Cómo convive con Nakama

`SignalingChannel` **no** abre una conexión propia a Nakama — recibe la instancia de `Socket`/sesión que `NakamaClient` ya mantiene abierta desde que se creó/unió a la sala, y sólo agrega un listener para los opcodes 100–103 ([03-Diseno.md §7.1](./03-Diseno.md#71-señalización-vía-nakama-json)) dentro del match activo. Esto cumple RF-01 al pie de la letra: cero infraestructura de señalización nueva.

```typescript
// SignalingChannel.ts
class SignalingChannel {
  constructor(private nakamaSocket: NakamaSocket, private matchId: string) {
    nakamaSocket.onmatchdata = (msg) => this.routeIncoming(msg); // opcodes 100-103 solamente
  }

  publishCandidate(candidate: PeerCandidate) {
    return this.nakamaSocket.sendMatchState(this.matchId, 100, JSON.stringify(candidate));
  }
  // publishReady(), publishState(), publishBye() siguen el mismo patrón (opcodes 101-103)
}
```

---

## 6. Referencias cruzadas

- Requerimientos que originan cada función → [01-Requerimientos.md](./01-Requerimientos.md)
- Justificación de por qué cada pieza se diseñó así (loopback proxy, socket único multiplexado, etc.) → [02-Analisis.md](./02-Analisis.md)
- Diagramas de flujo, protocolo y máquina de estados que este código implementa → [03-Diseno.md](./03-Diseno.md)
- Plan de implementación por fases y tareas de testing → [05-Checklist.md](./05-Checklist.md)
