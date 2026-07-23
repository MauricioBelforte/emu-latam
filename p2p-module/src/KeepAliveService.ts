import { encodePacket } from './protocol/packet';
import { PacketType, KEEPALIVE_INTERVAL_MS, KEEPALIVE_MAX_MISSED } from './protocol/types';
import { UDPTransport } from './UDPTransport';

export class KeepAliveService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private missed = 0;
  private onLost: (() => void) | null = null;
  private remoteAddr = '';
  private remotePort = 0;
  private sessionToken = 0;
  private intervalMs: number;

  constructor(private transport: UDPTransport, intervalMs = KEEPALIVE_INTERVAL_MS) {
    this.intervalMs = intervalMs;
  }

  start(
    token: number,
    remoteAddr: string,
    remotePort: number,
    onLost: () => void,
  ): void {
    this.sessionToken = token;
    this.remoteAddr = remoteAddr;
    this.remotePort = remotePort;
    this.onLost = onLost;
    this.missed = 0;

    this.transport.onRawMessage(this.handleAck);
    this.intervalId = setInterval(() => this.sendKeepalive(), this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.transport.offRawMessage(this.handleAck);
    this.missed = 0;
  }

  private handleAck = (data: Buffer, rinfo: { address: string; port: number }): void => {
    if (data.length < 4) return;
    const type = data.readUInt8(1);
    if (type !== PacketType.KEEPALIVE_ACK) return;
    this.missed = 0;
  };

  private sendKeepalive(): void {
    const pkt = encodePacket(PacketType.KEEPALIVE, this.sessionToken);
    this.transport.send(pkt, this.remotePort, this.remoteAddr);
    this.missed++;
    if (this.missed >= KEEPALIVE_MAX_MISSED) {
      this.onLost?.();
      this.stop();
    }
  }
}
