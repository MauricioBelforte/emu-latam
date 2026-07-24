import dgram from "dgram";
import { P2PManager } from "../../../p2p-module/src/index";
import { PacketType } from "../../../p2p-module/src/protocol/types";
import { encodePacket, decodePacket } from "../../../p2p-module/src/protocol/packet";

const GGPO_HOST_PORT = 6003;
const GGPO_GUEST_PORT = 6004;

let ggpoHostManager: { manager: P2PManager; token: number } | null = null;
let ggpoGuestManager: { manager: P2PManager; token: number } | null = null;
let ggpoHostRelaySocket: dgram.Socket | null = null;
let ggpoGuestForwarderSocket: dgram.Socket | null = null;
let ggpoTokenCounter = 200;

export async function handleGGPOP2PHost(): Promise<any> {
  const token = ggpoTokenCounter++;
  const manager = new P2PManager({
    sessionToken: token,
    callbacks: {
      onStatus: (s: any) => console.log(`[GGPO-P2P-HOST] ${JSON.stringify(s)}`),
      onConnected: (peerId: string, mode: string) =>
        console.log(`[GGPO-P2P-HOST] Connected to ${peerId} via ${mode}`),
      onDisconnected: (peerId: string, reason: string) =>
        console.log(`[GGPO-P2P-HOST] Disconnected: ${reason}`),
      onError: (code: string, msg: string) =>
        console.log(`[GGPO-P2P-HOST] Error ${code}: ${msg}`),
    },
  });

  await manager.startHost();
  const candidate = await manager.sendCandidate();

  ggpoHostManager = { manager, token };
  return { success: true, token, status: manager.status, candidate };
}

export async function handleGGPOP2PHostRegisterGuest(guestCandidate: any): Promise<any> {
  if (!ggpoHostManager) return { success: false, error: "No active GGPO P2P host manager" };
  if (!guestCandidate) return { success: false, error: "No guest candidate provided" };

  const { manager } = ggpoHostManager;
  const relayToken = ggpoTokenCounter++;
  await manager.onGuestJoin(guestCandidate, relayToken);

  const relaySocket = dgram.createSocket("udp4");
  const relayPort = await new Promise<number>((resolve, reject) => {
    relaySocket.on("message", (data: Buffer) => {
      // Respuesta de GGPO host → reenviar al guest via P2P transport
      const remote = manager.getRemoteInfo();
      if (remote) {
        const pkt = encodePacket(PacketType.RELAY_DATA, relayToken, data);
        const transport = manager.getTransport();
        if (transport) transport.send(pkt, remote.port, remote.address);
      }
    });
    relaySocket.on("error", (err: any) => {
      console.error("[GGPO-P2P-HOST] relaySocket error:", err.message);
      relaySocket.close();
      reject(err);
    });
    relaySocket.bind(0, "127.0.0.1", () => resolve(relaySocket.address().port));
  });

  // Recibir datos del guest via P2P → reenviar a GGPO host en 6003
  const transport = manager.getTransport();
  if (transport) {
    transport.onRawMessage((data: Buffer) => {
      const pkt = decodePacket(data);
      if (pkt && pkt.type === PacketType.RELAY_DATA) {
        relaySocket.send(pkt.payload, GGPO_HOST_PORT, "127.0.0.1");
      }
    });
  }

  ggpoHostRelaySocket = relaySocket;
  return { success: true, relayPort, peerId: guestCandidate.peerId || "unknown" };
}

export async function handleGGPOP2PGuest(hostCandidate: any): Promise<any> {
  if (!hostCandidate) return { success: false, error: "No host candidate provided" };

  const token = ggpoTokenCounter++;
  const manager = new P2PManager({
    sessionToken: token,
    callbacks: {
      onStatus: (s: any) => console.log(`[GGPO-P2P-GUEST] ${JSON.stringify(s)}`),
      onConnected: (peerId: string, mode: string) =>
        console.log(`[GGPO-P2P-GUEST] Connected to ${peerId} via ${mode}`),
      onDisconnected: (peerId: string, reason: string) =>
        console.log(`[GGPO-P2P-GUEST] Disconnected: ${reason}`),
      onError: (code: string, msg: string) =>
        console.log(`[GGPO-P2P-GUEST] Error ${code}: ${msg}`),
    },
  });

  await manager.startJoin(hostCandidate);
  const guestCandidate = await manager.sendCandidate();

  if (manager.status === "lan_check") {
    const remote = manager.getRemoteInfo();
    const hostLanIp = remote?.address || hostCandidate.privateIps?.[0] || hostCandidate.publicIp;
    console.log(`[GGPO-P2P-GUEST] LAN mode directo — hostLanIp=${hostLanIp}`);
    ggpoGuestManager = { manager, token };
    return { success: true, isLan: true, hostLanIp, candidate: guestCandidate };
  }

  console.log(`[GGPO-P2P-GUEST] WAN mode — creando forwarder...`);
  const transport = manager.getTransport();

  const forwarderSocket = dgram.createSocket("udp4");
  const forwarderPort = await new Promise<number>((resolve, reject) => {
    forwarderSocket.on("message", (data: Buffer) => {
      // Datos de GGPO guest → reenviar al host via P2P transport
      const remote = manager.getRemoteInfo();
      if (remote && transport) {
        const pkt = encodePacket(PacketType.RELAY_DATA, token, data);
        transport.send(pkt, remote.port, remote.address);
      }
    });
    forwarderSocket.on("error", (err: any) => {
      console.error("[GGPO-P2P-GUEST] forwarderSocket error:", err.message);
      forwarderSocket.close();
      reject(err);
    });
    forwarderSocket.bind(0, "127.0.0.1", () => resolve(forwarderSocket.address().port));
  });

  if (transport) {
    transport.onRawMessage((data: Buffer) => {
      const pkt = decodePacket(data);
      if (pkt && pkt.type === PacketType.RELAY_DATA) {
        forwarderSocket.send(pkt.payload, GGPO_GUEST_PORT, "127.0.0.1");
      }
    });
  }

  ggpoGuestManager = { manager, token };
  ggpoGuestForwarderSocket = forwarderSocket;
  return { success: true, isLan: false, forwarderPort, candidate: guestCandidate };
}

export function handleGGPOP2PDisconnect(): any {
  if (ggpoGuestForwarderSocket) {
    try { ggpoGuestForwarderSocket.close(); } catch {}
    ggpoGuestForwarderSocket = null;
  }
  if (ggpoHostRelaySocket) {
    try { ggpoHostRelaySocket.close(); } catch {}
    ggpoHostRelaySocket = null;
  }
  if (ggpoGuestManager) {
    try { ggpoGuestManager.manager.disconnect(); } catch {}
    ggpoGuestManager = null;
  }
  if (ggpoHostManager) {
    try { ggpoHostManager.manager.disconnect(); } catch {}
    ggpoHostManager = null;
  }
  ggpoTokenCounter = 200;
  return { success: true };
}
