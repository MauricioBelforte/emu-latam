import { describe, it, expect } from 'vitest';
import { UDPTransport } from '../src/UDPTransport';
import { doHolePunch } from '../src/HolePuncher';
import { PeerCandidate, PacketType, PROTOCOL_VERSION } from '../src/protocol/types';
import { encodePacket } from '../src/protocol/packet';

function makePunchResponder(transport: UDPTransport, expectToken: number): void {
  transport.onRawMessage((data, rinfo) => {
    if (data.length < 4) return;
    const type = data.readUInt8(1);
    if (type === PacketType.PUNCH) {
      const ack = encodePacket(PacketType.PUNCH_ACK, expectToken);
      transport.send(ack, rinfo.port, rinfo.address);
    }
  });
}

describe('HolePuncher', () => {
  it('returns false when both symmetric NAT', async () => {
    const a = new UDPTransport();
    const b = new UDPTransport();
    await a.bind(0);
    await b.bind(0);

    const host: PeerCandidate = {
      peerId: 'host',
      publicIp: '127.0.0.1',
      publicPort: a.port,
      privateIps: ['127.0.0.1'],
      natType: 'symmetric',
      protocolVersion: PROTOCOL_VERSION,
    };

    const guest: PeerCandidate = {
      peerId: 'guest',
      publicIp: '127.0.0.1',
      publicPort: b.port,
      privateIps: ['127.0.0.1'],
      natType: 'symmetric',
      protocolVersion: PROTOCOL_VERSION,
    };

    const result = await doHolePunch(a, host, guest, 42);
    expect(result).toBe(false);

    a.close();
    b.close();
  });

  it('succeeds when peers are on localhost (cone+cone)', async () => {
    const a = new UDPTransport();
    const b = new UDPTransport();
    await a.bind(0);
    await b.bind(0);

    makePunchResponder(a, 42);
    makePunchResponder(b, 42);

    const host: PeerCandidate = {
      peerId: 'host',
      publicIp: '127.0.0.1',
      publicPort: a.port,
      privateIps: ['127.0.0.1'],
      natType: 'cone',
      protocolVersion: PROTOCOL_VERSION,
    };

    const guest: PeerCandidate = {
      peerId: 'guest',
      publicIp: '127.0.0.1',
      publicPort: b.port,
      privateIps: ['127.0.0.1'],
      natType: 'cone',
      protocolVersion: PROTOCOL_VERSION,
    };

    const result = await doHolePunch(a, host, guest, 42);
    expect(result).toBe(true);

    a.close();
    b.close();
  });
});
