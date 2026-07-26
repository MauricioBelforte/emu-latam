import { UDPTransport } from './UDPTransport';
import { NatDetector } from './NatDetector';
import { doHolePunch } from './HolePuncher';
import { RelayServer } from './RelayServer';
import { KeepAliveService } from './KeepAliveService';
import { StateMachine } from './StateMachine';
import { encodePacket, decodePacket } from './protocol/packet';
import {
  PacketType,
  PeerCandidate,
  PeerState,
  NatType,
  P2PEventCallbacks,
  P2PStatus,
  NatResult,
  PROTOCOL_VERSION,
  RETROARCH_PORT,
} from './protocol/types';

export interface P2PManagerOptions {
  sessionToken: number;
  callbacks: P2PEventCallbacks;
}

export class P2PManager {
  private transport: UDPTransport;
  private sm: StateMachine;
  private relay: RelayServer;
  private keepalive: KeepAliveService;
  private opts: P2PManagerOptions;
  private nat: NatResult | null = null;
  private _role: 'host' | 'guest' = 'host';
  private localCandidate: PeerCandidate | null = null;
  private remoteCandidate: PeerCandidate | null = null;
  private remoteAddr: string = '';
  private remotePort: number = 0;
  private sessionToken: number;

  constructor(opts: P2PManagerOptions) {
    this.opts = opts;
    this.sessionToken = opts.sessionToken;
    this.transport = new UDPTransport();
    this.sm = new StateMachine();
    this.relay = new RelayServer(this.transport);
    this.keepalive = new KeepAliveService(this.transport);

    this.transport.onRawMessage((data, rinfo) => this.handlePacket(data, rinfo));
    this.transport.on('error', (err) => this.emitStatus({
      state: 'failed', progress: 0, message: `Transport error: ${err.message}`, mode: null,
    }));
  }

  private emitStatus(overrides: Partial<P2PStatus>): void {
    this.opts.callbacks.onStatus({
      state: this.sm.state,
      progress: 0,
      message: '',
      mode: null,
      ...overrides,
    });
  }

  private async ensureTransport(): Promise<void> {
    await this.transport.bind(0);
  }

  private async doNatDiscovery(): Promise<void> {
    if (this.nat) return; // already injected
    await this.ensureTransport();
    this.emitStatus({ progress: 10, message: 'Detectando NAT...' });
    this.nat = await NatDetector.detect(this.transport);
    this.emitStatus({ progress: 30, message: `NAT: ${this.nat.natType} → ${this.nat.publicIp}:${this.nat.publicPort}` });
  }

  // ========= HOST FLOW =========

  async startHost(): Promise<void> {
    this._role = 'host';
    await this.ensureTransport();
    await this.doNatDiscovery();
    this.sm.transition('discovery_done');

    this.localCandidate = {
      peerId: 'host',
      publicIp: this.nat!.publicIp,
      publicPort: this.nat!.publicPort,
      privateIps: NatDetector.getLocalIps(),
      natType: this.nat!.natType,
      protocolVersion: PROTOCOL_VERSION,
    };
  }

  async startRelayForGuest(guestId: string, token: number): Promise<void> {
    this.relay.registerPeer(guestId, token);
    this.sm.transition('signaling_guest_joined');
    this.emitStatus({ progress: 80, message: `Guest ${guestId} relay activo` });
  }

  async onGuestJoin(guestCandidate: PeerCandidate, token: number): Promise<void> {
    if (this.sm.state === 'discovering' || this.sm.state === 'idle') {
      await this.startHost();
    }

    // LAN check (todas las IPs, priorizando LAN real sobre VPN/Tailscale)
    const hostIps = this.localCandidate!.privateIps.length ? this.localCandidate!.privateIps : [this.localCandidate!.publicIp];
    const guestIps = guestCandidate.privateIps.length ? guestCandidate.privateIps : [guestCandidate.publicIp];
    const matchingIps = guestIps.filter(gp => hostIps.some(hp => NatDetector.isSameSubnet(hp, gp)));
    const isRealLan = (ip: string) => !ip.startsWith('100.');
    const lanIp = matchingIps.find(isRealLan) || matchingIps[0];
    if (lanIp) {
      this.remoteAddr = lanIp;
      this.remotePort = RETROARCH_PORT;
      this.sm.transition('lan_match');
      this.opts.callbacks.onConnected(guestCandidate.peerId, 'lan');
      this.emitStatus({ state: 'lan_connected', progress: 100, message: 'LAN conectado', mode: 'lan' });
      return;
    }

    // Hole punching
    const punched = await doHolePunch(this.transport, this.localCandidate!, guestCandidate, this.sessionToken);
    if (punched) {
      this.remoteAddr = guestCandidate.publicIp;
      this.remotePort = guestCandidate.publicPort;
      this.sm.transition('punch_success');
      this.opts.callbacks.onConnected(guestCandidate.peerId, 'direct');
      this.emitStatus({ progress: 100, message: 'Conexión directa (hole punching)', mode: 'direct' });
    } else {
      this.sm.transition('punch_fail');
      this.remoteAddr = guestCandidate.publicIp;
      this.remotePort = guestCandidate.publicPort;
      this.relay.registerPeer(guestCandidate.peerId, token);
      this.opts.callbacks.onConnected(guestCandidate.peerId, 'relay');
      this.emitStatus({ progress: 100, message: 'Conexión relay activa', mode: 'relay' });
    }
  }

  // ========= GUEST FLOW =========

  async startJoin(hostCandidate: PeerCandidate): Promise<void> {
    this._role = 'guest';
    await this.ensureTransport();
    await this.doNatDiscovery();
    this.sm.transition('discovery_done');

    this.localCandidate = {
      peerId: 'guest',
      publicIp: this.nat!.publicIp,
      publicPort: this.nat!.publicPort,
      privateIps: NatDetector.getLocalIps(),
      natType: this.nat!.natType,
      protocolVersion: PROTOCOL_VERSION,
    };

    this.remoteCandidate = hostCandidate;
    this.sessionToken = this.opts.sessionToken;

    // LAN check (todas las IPs, priorizando LAN real sobre VPN/Tailscale)
    const hostIps = hostCandidate.privateIps.length ? hostCandidate.privateIps : [hostCandidate.publicIp];
    const guestIps = this.localCandidate.privateIps.length ? this.localCandidate.privateIps : [this.localCandidate.publicIp];
    const matchingIps = hostIps.filter(hp => guestIps.some(gp => NatDetector.isSameSubnet(hp, gp)));
    // Preferir IP que NO sea 100.x.x.x (Tailscale) sobre VPN
    const isRealLan = (ip: string) => !ip.startsWith('100.');
    const lanIp = matchingIps.find(isRealLan) || matchingIps[0];
    if (lanIp) {
      this.remoteAddr = lanIp;
      this.remotePort = RETROARCH_PORT;
      this.sm.transition('lan_match');
      this.opts.callbacks.onConnected('host', 'lan');
      this.emitStatus({ state: 'lan_connected', progress: 100, message: 'LAN conectado', mode: 'lan' });
      return;
    }

    // Hole punching
    const punched = await doHolePunch(this.transport, this.localCandidate, hostCandidate, this.sessionToken);
    if (punched) {
      this.remoteAddr = hostCandidate.publicIp;
      this.remotePort = hostCandidate.publicPort;
      this.sm.transition('punch_success');
      this.opts.callbacks.onConnected('host', 'direct');
      this.emitStatus({ progress: 100, message: 'Conexión directa', mode: 'direct' });
    } else {
      this.sm.transition('punch_fail');
      this.remoteAddr = hostCandidate.publicIp;
      this.remotePort = hostCandidate.publicPort;
      // Use relay — el host maneja del otro lado
      this.opts.callbacks.onConnected('host', 'relay');
      this.emitStatus({ progress: 100, message: 'Usando relay del host', mode: 'relay' });
    }
  }

  async startJoinWan(hostCandidate: PeerCandidate): Promise<void> {
    this._role = 'guest';
    await this.ensureTransport();
    await this.doNatDiscovery();
    this.sm.transition('discovery_done');

    this.localCandidate = {
      peerId: 'guest',
      publicIp: this.nat!.publicIp,
      publicPort: this.nat!.publicPort,
      privateIps: NatDetector.getLocalIps(),
      natType: this.nat!.natType,
      protocolVersion: PROTOCOL_VERSION,
    };

    this.remoteCandidate = hostCandidate;
    this.sessionToken = this.opts.sessionToken;

    // Hole punching
    const punched = await doHolePunch(this.transport, this.localCandidate, hostCandidate, this.sessionToken);
    if (punched) {
      this.remoteAddr = hostCandidate.publicIp;
      this.remotePort = hostCandidate.publicPort;
      this.sm.transition('punch_success');
      this.opts.callbacks.onConnected('host', 'direct');
      this.emitStatus({ progress: 100, message: 'Conexión directa', mode: 'direct' });
    } else {
      // WAN sin Nakama → enviar RELAY_REQUEST y esperar RELAY_ACK
      this.remoteAddr = hostCandidate.publicIp;
      this.remotePort = hostCandidate.publicPort;
      this.sm.transition('punch_fail');

      await this.sendRelayRequest();

      // Esperar RELAY_ACK con timeout 8s
      await waitForRelayAck(this.transport, 8000);

      this.opts.callbacks.onConnected('host', 'relay');
      this.emitStatus({ progress: 100, message: 'Relay conectado (WAN manual)', mode: 'relay' });
    }
  }

  // ========= SHARED =========

  async sendGameData(data: Buffer): Promise<void> {
    if (this.remoteAddr && this.remotePort) {
      const pkt = encodePacket(PacketType.RELAY_DATA, this.sessionToken, data);
      await this.transport.send(pkt, this.remotePort, this.remoteAddr);
    }
  }

  startKeepalive(onLost: () => void): void {
    if (this.remoteAddr && this.remotePort) {
      this.keepalive.start(this.sessionToken, this.remoteAddr, this.remotePort, onLost);
    }
  }

  stopKeepalive(): void {
    this.keepalive.stop();
  }

  get status(): PeerState {
    return this.sm.state;
  }

  get role(): 'host' | 'guest' {
    return this._role;
  }

  getNatInfo(): NatResult | null {
    return this.nat;
  }

  getRemoteInfo(): { address: string; port: number } | null {
    return this.remoteAddr ? { address: this.remoteAddr, port: this.remotePort } : null;
  }

  getRelayPeerCount(): number {
    return this.relay.getPeerCount();
  }

  private handlePacket(data: Buffer, rinfo: { address: string; port: number }): void {
    const pkt = decodePacket(data);
    if (!pkt) return;

    switch (pkt.type) {
      case PacketType.PUNCH:
        this.transport.send(encodePacket(PacketType.PUNCH_ACK, pkt.sessionToken), rinfo.port, rinfo.address);
        break;
      case PacketType.PUNCH_ACK:
        if (!this.remoteAddr) {
          this.remoteAddr = rinfo.address;
          this.remotePort = rinfo.port;
        }
        break;
      case PacketType.KEEPALIVE:
        this.transport.send(encodePacket(PacketType.KEEPALIVE_ACK, pkt.sessionToken), rinfo.port, rinfo.address);
        break;
      case PacketType.KEEPALIVE_ACK:
        this.keepalive.onAckReceived();
        break;
      case PacketType.RELAY_REQUEST: {
        // Guest solicita relay → registrar peer + responder RELAY_ACK
        if (this._role !== 'host') break;
        console.log(`[P2P-RELAY] RELAY_REQUEST from ${rinfo.address}:${rinfo.port}`);
        const guestToken = pkt.sessionToken;
        const guestId = `wan-${rinfo.address}-${rinfo.port}`;
        this.remoteAddr = rinfo.address;
        this.remotePort = rinfo.port;
        const relayToken = Math.floor(Math.random() * 65535);
        this.relay.registerPeer(guestId, relayToken);
        this.transport.send(encodePacket(PacketType.RELAY_ACK, relayToken), rinfo.port, rinfo.address);
        this.sm.transition('relay_connected');
        this.emitStatus({ state: 'relay_connected', progress: 100, message: 'Relay conectado (RELAY_REQUEST)', mode: 'relay' });
        this.opts.callbacks.onConnected(guestId, 'relay');
        break;
      }
      case PacketType.RELAY_ACK:
        // Guest recibe confirmación de relay del host
        if (!this.remoteAddr) {
          this.remoteAddr = rinfo.address;
          this.remotePort = rinfo.port;
        }
        this.sm.transition('relay_connected');
        this.emitStatus({ state: 'relay_connected', progress: 100, message: 'Relay confirmado', mode: 'relay' });
        // onConnected es llamado por startJoinWan() después de recibir RELAY_ACK
        break;
      case PacketType.DISCONNECT:
        this.emitStatus({ state: 'disconnected', progress: 0, message: 'Peer desconectado', mode: null });
        this.opts.callbacks.onDisconnected('', 'Remote disconnect');
        break;
    }
  }

  async sendRelayRequest(): Promise<void> {
    if (!this.remoteCandidate) return;
    const token = Math.floor(Math.random() * 65535);
    await this.transport.send(
      encodePacket(PacketType.RELAY_REQUEST, token),
      this.remoteCandidate.publicPort,
      this.remoteCandidate.publicIp,
    );
  }

  // Permite enviar el candidate al otro lado via signaling externo (Nakama)
  async sendCandidate(): Promise<PeerCandidate | null> {
    return this.localCandidate;
  }

  async receiveCandidate(candidate: PeerCandidate): Promise<void> {
    this.remoteCandidate = candidate;
  }

  async disconnect(): Promise<void> {
    if (this.remoteAddr && this.remotePort) {
      await this.transport.send(
        encodePacket(PacketType.DISCONNECT, this.sessionToken),
        this.remotePort,
        this.remoteAddr,
      );
    }
    this.keepalive.stop();
    this.relay.removeAll();
    this.sm.reset();
    this.transport.close();
  }

  getTransport(): UDPTransport {
    return this.transport;
  }

  /** Set NAT result manually (useful for testing) */
  setNatResult(nat: NatResult): void {
    this.nat = nat;
  }
}

function waitForRelayAck(transport: UDPTransport, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      transport.removeListener('message', handler);
      reject(new Error('RELAY_ACK timeout'));
    }, timeoutMs);

    const handler = (data: Buffer) => {
      const pkt = decodePacket(data);
      if (pkt && pkt.type === PacketType.RELAY_ACK) {
        clearTimeout(timer);
        transport.removeListener('message', handler);
        resolve();
      }
    };
    transport.on('raw-message', handler);
  });
}
