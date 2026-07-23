import { describe, it, expect } from 'vitest';
import { encodePacket, decodePacket } from '../src/protocol/packet';
import { PacketType, PROTOCOL_VERSION } from '../src/protocol/types';

describe('packet', () => {
  it('encode + decode roundtrip (no payload)', () => {
    const token = 12345;
    const buf = encodePacket(PacketType.KEEPALIVE, token);
    const dec = decodePacket(buf);
    expect(dec).not.toBeNull();
    expect(dec!.version).toBe(PROTOCOL_VERSION);
    expect(dec!.type).toBe(PacketType.KEEPALIVE);
    expect(dec!.sessionToken).toBe(token);
    expect(dec!.payload.length).toBe(0);
  });

  it('encode + decode roundtrip (with payload)', () => {
    const token = 999;
    const payload = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]);
    const buf = encodePacket(PacketType.RELAY_DATA, token, payload);
    const dec = decodePacket(buf);
    expect(dec).not.toBeNull();
    expect(dec!.type).toBe(PacketType.RELAY_DATA);
    expect(dec!.sessionToken).toBe(token);
    expect([...dec!.payload]).toEqual([0xDE, 0xAD, 0xBE, 0xEF]);
  });

  it('returns null for too-short buffer', () => {
    expect(decodePacket(Buffer.from([0x01, 0x02]))).toBeNull();
  });

  it('all packet types roundtrip', () => {
    const types = [
      PacketType.PUNCH,
      PacketType.PUNCH_ACK,
      PacketType.KEEPALIVE,
      PacketType.KEEPALIVE_ACK,
      PacketType.RELAY_DATA,
      PacketType.DISCONNECT,
    ];
    for (const type of types) {
      const buf = encodePacket(type, 42);
      const dec = decodePacket(buf);
      expect(dec!.type).toBe(type);
      expect(dec!.sessionToken).toBe(42);
    }
  });
});
