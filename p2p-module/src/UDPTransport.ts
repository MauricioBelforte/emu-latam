import dgram from 'dgram';
import { EventEmitter } from 'events';
import { encodePacket, decodePacket } from './protocol/packet';
import { PacketType, DecodedPacket } from './protocol/types';

type MessageHandler = (data: Buffer, rinfo: { address: string; port: number }) => void;
type PacketHandler = (pkt: DecodedPacket, rinfo: { address: string; port: number }) => void;

export class UDPTransport extends EventEmitter {
  private socket: dgram.Socket;
  private _bound = false;

  constructor() {
    super();
    this.socket = dgram.createSocket('udp4');
    this.socket.on('message', (msg, rinfo) => {
      this.emit('raw-message', msg, rinfo);
    });
    this.socket.on('error', (err) => this.emit('error', err));
  }

  async bind(port = 0, host = '0.0.0.0'): Promise<number> {
    if (this._bound) return this.port;
    return new Promise((resolve, reject) => {
      this.socket.bind(port, host, () => {
        this._bound = true;
        resolve(this.socket.address().port);
      });
      this.socket.once('error', reject);
    });
  }

  get port(): number {
    return this.socket.address()?.port ?? 0;
  }

  send(data: Buffer, port: number, address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.send(data, port, address, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  onRawMessage(handler: MessageHandler): void {
    this.on('raw-message', handler);
  }

  offRawMessage(handler: MessageHandler): void {
    this.off('raw-message', handler);
  }

  // STUN: envía binding request a servidor STUN público y parsea respuesta
  async stunBindingRequest(
    server: { host: string; port: number },
    timeoutMs = 2000,
  ): Promise<{ address: string; port: number } | null> {
    const txId = Buffer.alloc(12);
    for (let i = 0; i < 12; i++) txId[i] = Math.floor(Math.random() * 256);

    // STUN binding request: type=0x0001, length=0, cookie=0x2112A442
    const req = Buffer.alloc(20);
    req.writeUInt16BE(0x0001, 0);       // Binding Request
    req.writeUInt16BE(0, 2);            // Length
    req.writeUInt32BE(0x2112A442, 4);   // Magic Cookie
    txId.copy(req, 8);                  // Transaction ID (12 bytes)

    await this.send(req, server.port, server.host);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.off('raw-message', handler);
        resolve(null);
      }, timeoutMs);

      const handler = (msg: Buffer) => {
        if (msg.length < 20) return;
        const type = msg.readUInt16BE(0);
        const cookie = msg.readUInt32BE(4);
        const rcvTxId = msg.subarray(8, 20);

        if (type !== 0x0101 || cookie !== 0x2112A442 || !rcvTxId.equals(txId)) return;

        // Parsear XOR-MAPPED-ADDRESS (type=0x0020)
        const len = msg.readUInt16BE(2);
        let offset = 20;
        while (offset < 20 + len) {
          const attrType = msg.readUInt16BE(offset);
          const attrLen = msg.readUInt16BE(offset + 2);
          if (attrType === 0x0020) {
            const family = msg.readUInt8(offset + 5); // 0x01 = IPv4
            if (family === 0x01) {
              const xorPort = msg.readUInt16BE(offset + 6) ^ 0x2112;
              const xorIp = Buffer.alloc(4);
              xorIp[0] = msg[offset + 8] ^ 0x21;
              xorIp[1] = msg[offset + 9] ^ 0x12;
              xorIp[2] = msg[offset + 10] ^ 0xA4;
              xorIp[3] = msg[offset + 11] ^ 0x42;
              const ip = `${xorIp[0]}.${xorIp[1]}.${xorIp[2]}.${xorIp[3]}`;
              clearTimeout(timer);
              this.off('raw-message', handler);
              resolve({ address: ip, port: xorPort });
              return;
            }
          }
          offset += 4 + attrLen;
        }
      };

      this.on('raw-message', handler);
    });
  }

  // Espera un paquete que cumpla una condición
  async waitForPacket(
    predicate: (pkt: DecodedPacket, rinfo: { address: string; port: number }) => boolean,
    timeoutMs: number,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.off('raw-message', handler);
        resolve(false);
      }, timeoutMs);

      const handler = (msg: Buffer, rinfo: { address: string; port: number }) => {
        const pkt = decodePacket(msg);
        if (pkt && predicate(pkt, rinfo)) {
          clearTimeout(timer);
          this.off('raw-message', handler);
          resolve(true);
        }
      };
      this.on('raw-message', handler);
    });
  }

  close(): void {
    try { this.socket.close(); } catch { /* ignore */ }
    this.removeAllListeners();
  }
}
