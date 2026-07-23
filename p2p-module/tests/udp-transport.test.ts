import { describe, it, expect } from 'vitest';
import { UDPTransport } from '../src/UDPTransport';
import { encodePacket, decodePacket } from '../src/protocol/packet';
import { PacketType } from '../src/protocol/types';

describe('UDPTransport', () => {
  it('binds to random port', async () => {
    const t = new UDPTransport();
    const port = await t.bind(0);
    expect(port).toBeGreaterThan(0);
    t.close();
  });

  it('send and receive message', async () => {
    const a = new UDPTransport();
    const b = new UDPTransport();
    const portA = await a.bind(0);
    await b.bind(0);

    const received = new Promise<Buffer>((resolve) => {
      a.onRawMessage((data) => resolve(data));
    });

    const payload = Buffer.from([0x01, 0x02, 0x03]);
    await b.send(payload, portA, '127.0.0.1');

    const msg = await received;
    expect([...msg]).toEqual([0x01, 0x02, 0x03]);

    a.close();
    b.close();
  });

  it('send and receive P2P packet', async () => {
    const a = new UDPTransport();
    const b = new UDPTransport();
    const portA = await a.bind(0);
    await b.bind(0);

    const received = new Promise<Buffer>((resolve) => {
      a.onRawMessage((data) => resolve(data));
    });

    const pkt = encodePacket(PacketType.PUNCH, 42, Buffer.from([0xAA]));
    await b.send(pkt, portA, '127.0.0.1');

    const msg = await received;
    const dec = decodePacket(msg);
    expect(dec).not.toBeNull();
    expect(dec!.type).toBe(PacketType.PUNCH);
    expect(dec!.sessionToken).toBe(42);
    expect([...dec!.payload]).toEqual([0xAA]);

    a.close();
    b.close();
  });
});
