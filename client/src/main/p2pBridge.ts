import dgram from "dgram";
import { P2PManager } from "../../../p2p-module/src/index";
import { RETROARCH_PORT, PacketType } from "../../../p2p-module/src/protocol/types";
import { encodePacket, decodePacket } from "../../../p2p-module/src/protocol/packet";

interface StoredManager {
  manager: P2PManager;
  token: number;
}

let hostManager: StoredManager | null = null;
let guestForwarder: dgram.Socket | null = null;
let tokenCounter = 100;

export async function handleP2PHost(): Promise<any> {
  const token = tokenCounter++;

  const manager = new P2PManager({
    sessionToken: token,
    callbacks: {
      onStatus: (s: any) => console.log(`[P2P-HOST] ${JSON.stringify(s)}`),
      onConnected: (peerId: string, mode: string) =>
        console.log(`[P2P-HOST] Connected to ${peerId} via ${mode}`),
      onDisconnected: (peerId: string, reason: string) =>
        console.log(`[P2P-HOST] Disconnected: ${reason}`),
      onError: (code: string, msg: string) =>
        console.log(`[P2P-HOST] Error ${code}: ${msg}`),
    },
  });

  await manager.startHost();
  const candidate = await manager.sendCandidate();

  hostManager = { manager, token };

  return {
    success: true,
    token,
    status: manager.status,
    nat: manager.getNatInfo(),
    candidate,
  };
}

export async function handleP2PGuest(hostCandidate: any): Promise<any> {
  if (!hostCandidate) {
    return { success: false, error: "No host candidate provided." };
  }

  const token = tokenCounter++;
  const manager = new P2PManager({
    sessionToken: token,
    callbacks: {
      onStatus: (s: any) => console.log(`[P2P-GUEST] ${JSON.stringify(s)}`),
      onConnected: (peerId: string, mode: string) =>
        console.log(`[P2P-GUEST] Connected to ${peerId} via ${mode}`),
      onDisconnected: (peerId: string, reason: string) =>
        console.log(`[P2P-GUEST] Disconnected: ${reason}`),
      onError: (code: string, msg: string) =>
        console.log(`[P2P-GUEST] Error ${code}: ${msg}`),
    },
  });

  await manager.startJoin(hostCandidate);
  const guestCandidate = await manager.sendCandidate();

  // Crear forwarder local: escucha en 55435, reenvía via P2P
  const transport = manager.getTransport();
  guestForwarder = dgram.createSocket("udp4");

  guestForwarder.on("message", (gameData) => {
    const pkt = encodePacket(PacketType.RELAY_DATA, token, gameData);
    const remote = manager.getRemoteInfo();
    if (remote) {
      transport.send(pkt, remote.port, remote.address);
    }
  });

  await new Promise<void>((resolve, reject) => {
    guestForwarder!.bind(RETROARCH_PORT, "127.0.0.1", () => resolve());
    guestForwarder!.on("error", reject);
  });

  // Forward RELAY_DATA del host → RetroArch local
  transport.onRawMessage((data) => {
    const pkt = decodePacket(data);
    if (pkt && pkt.type === PacketType.RELAY_DATA && guestForwarder) {
      guestForwarder.send(pkt.payload, RETROARCH_PORT, "127.0.0.1");
    }
  });

  // Same-machine: bridge guest → host
  if (hostManager && guestCandidate) {
    await hostManager.manager.onGuestJoin(guestCandidate, token);
  }

  return {
    success: true,
    token,
    status: manager.status,
    nat: manager.getNatInfo(),
    candidate: guestCandidate,
    hostConnected: !!hostManager,
  };
}

export async function handleP2PHostRegisterGuest(guestCandidate: any): Promise<any> {
  if (!hostManager) {
    return { success: false, error: "No active host manager." };
  }
  if (!guestCandidate) {
    return { success: false, error: "No guest candidate provided." };
  }
  const token = tokenCounter++;
  await hostManager.manager.onGuestJoin(guestCandidate, token);
  return { success: true, token, status: hostManager.manager.status };
}

export function handleP2PDisconnect(): any {
  if (guestForwarder) {
    try { guestForwarder.close(); } catch {}
    guestForwarder = null;
  }
  if (hostManager) {
    try { hostManager.manager.disconnect(); } catch {}
    hostManager = null;
  }
  return { success: true };
}
