import dgram from 'dgram';
import { UDPTransport } from './UDPTransport';
import { encodePacket, decodePacket } from './protocol/packet';
import { PacketType, GuestRoute, RETROARCH_PORT } from './protocol/types';

export class RelayServer {
  private routes = new Map<string, GuestRoute>();
  private tokensByPeer = new Map<string, number>();
  private peerByToken = new Map<number, string>();

  constructor(private transport: UDPTransport) {
    this.transport.onRawMessage((data, rinfo) => this.handleIncoming(data, rinfo));
  }

  registerPeer(peerId: string, sessionToken: number): void {
    this.tokensByPeer.set(peerId, sessionToken);
    this.peerByToken.set(sessionToken, peerId);
  }

  unregisterPeer(peerId: string): void {
    const token = this.tokensByPeer.get(peerId);
    if (token !== undefined) this.peerByToken.delete(token);
    this.tokensByPeer.delete(peerId);
  }

  private handleIncoming(data: Buffer, rinfo: { address: string; port: number }): void {
    const pkt = decodePacket(data);
    if (!pkt || pkt.type !== PacketType.RELAY_DATA) return;

    const peerId = this.peerByToken.get(pkt.sessionToken);
    if (!peerId) return;

    let route = this.routes.get(peerId);
    if (!route) {
      route = this.createRoute(peerId, rinfo);
      this.routes.set(peerId, route);
    }

    route.lastSeen = Date.now();
    route.remoteAddr = rinfo.address;
    route.remotePort = rinfo.port;
    route.localForwardSocket.send(pkt.payload, RETROARCH_PORT, '127.0.0.1');
  }

  private createRoute(peerId: string, rinfo: { address: string; port: number }): GuestRoute {
    const sock = dgram.createSocket('udp4');
    sock.bind(0, '127.0.0.1');

    const token = this.tokensByPeer.get(peerId)!;
    sock.on('message', (reply) => {
      const wrapped = encodePacket(PacketType.RELAY_DATA, token, reply);
      this.transport.send(wrapped, rinfo.port, rinfo.address);
    });

    return {
      peerId,
      remoteAddr: rinfo.address,
      remotePort: rinfo.port,
      localForwardSocket: sock,
      lastSeen: Date.now(),
    };
  }

  removeRoute(peerId: string): void {
    const route = this.routes.get(peerId);
    if (route) {
      try { route.localForwardSocket.close(); } catch { /* ignore */ }
    }
    this.routes.delete(peerId);
    this.unregisterPeer(peerId);
  }

  removeAll(): void {
    for (const id of this.routes.keys()) this.removeRoute(id);
  }

  getPeerCount(): number {
    return this.routes.size;
  }
}
