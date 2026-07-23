import { PacketType, DecodedPacket, PROTOCOL_VERSION } from './types';

const HEADER_SIZE = 4;

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
