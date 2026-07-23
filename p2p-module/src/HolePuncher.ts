import { encodePacket } from './protocol/packet';
import { PacketType, PeerCandidate } from './protocol/types';
import { UDPTransport } from './UDPTransport';

const ATTEMPTS = [
  { waitBefore: 0, timeout: 400 },
  { waitBefore: 400, timeout: 800 },
  { waitBefore: 1200, timeout: 1600 },
];

export async function doHolePunch(
  transport: UDPTransport,
  local: PeerCandidate,
  remote: PeerCandidate,
  sessionToken: number,
): Promise<boolean> {
  if (local.natType === 'symmetric' && remote.natType === 'symmetric') {
    return false;
  }

  for (const attempt of ATTEMPTS) {
    if (attempt.waitBefore > 0) {
      await new Promise((r) => setTimeout(r, attempt.waitBefore));
    }

    await transport.send(
      encodePacket(PacketType.PUNCH, sessionToken),
      remote.publicPort,
      remote.publicIp,
    );

    const acked = await transport.waitForPacket(
      (pkt, rinfo) =>
        pkt.type === PacketType.PUNCH_ACK &&
        rinfo.address === remote.publicIp,
      attempt.timeout,
    );

    if (acked) {
      await transport.send(
        encodePacket(PacketType.PUNCH_ACK, sessionToken),
        remote.publicPort,
        remote.publicIp,
      );
      return true;
    }
  }

  return false;
}
