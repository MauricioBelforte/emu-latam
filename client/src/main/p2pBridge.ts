import dgram from "dgram";
import { P2PManager } from "../../../p2p-module/src/index";
import { RETROARCH_PORT, PacketType } from "../../../p2p-module/src/protocol/types";
import { encodePacket, decodePacket } from "../../../p2p-module/src/protocol/packet";
import { tryMapPort, tryUnmapPort } from "./services/upnp";
import { execSync } from "child_process";

function tryOpenWindowsFirewall(port: number, protocol: string, name: string): boolean {
  try {
    execSync(`netsh advfirewall firewall add rule name="${name}" dir=in action=allow protocol=${protocol} localport=${port}`, { stdio: "ignore", timeout: 5000 });
    console.log(`[FIREWALL] Regla creada: ${name} (${port}/${protocol})`);
    return true;
  } catch {
    console.log(`[FIREWALL] No se pudo crear regla para ${name} (${port}/${protocol}) — quizás no admin`);
    return false;
  }
}

interface StoredManager {
  manager: P2PManager;
  token: number;
}

let hostManager: StoredManager | null = null;
let guestForwarder: dgram.Socket | null = null;
let tokenCounter = 100;

async function startForwarder(token: number, manager: P2PManager): Promise<number> {
  const transport = manager.getTransport();

  // handler compartido para RELAY_DATA entrantes
  const pktHandler = (data: Buffer) => {
    const pkt = decodePacket(data);
    if (pkt && pkt.type === PacketType.RELAY_DATA && guestForwarder) {
      guestForwarder.send(pkt.payload, RETROARCH_PORT, "127.0.0.1");
    }
  };
  transport.onRawMessage(pktHandler);

  async function tryBind(port: number): Promise<number> {
    return new Promise((res, rej) => {
      const sock = dgram.createSocket("udp4");

      sock.on("message", (gameData) => {
        const pkt = encodePacket(PacketType.RELAY_DATA, token, gameData);
        const remote = manager.getRemoteInfo();
        if (remote) transport.send(pkt, remote.port, remote.address);
      });

      sock.once("error", (err) => { sock.close(); rej(err); });
      sock.bind(port, "127.0.0.1", () => {
        guestForwarder = sock;
        res(sock.address().port);
      });
    });
  }

  try {
    return await tryBind(RETROARCH_PORT);
  } catch (err: any) {
    if (err.code === "EADDRINUSE") {
      return await tryBind(0);
    }
    transport.offRawMessage(pktHandler);
    throw err;
  }
}

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

  // Intentar abrir puerto vía UPnP
  let upnpOk = false;
  if (candidate?.publicPort) {
    // Usar IP LAN real (excluir Tailscale 100.x.x.x) para el mapping UPnP
    const lanIp = candidate.privateIps?.find((ip: string) => !ip.startsWith('100.'));
    // El puerto privado es el bound real del transporte (no el STUN)
    const localPort = manager.getTransport().port;
    upnpOk = await tryMapPort(candidate.publicPort, 'UDP', 'EmuLatam-P2P', 0, lanIp, localPort);
    // También intentar abrir Windows Firewall para el puerto local real (el UPnP reenvía a este puerto)
    tryOpenWindowsFirewall(localPort, 'UDP', 'EmuLatam-P2P');
  }

  console.log(`[P2P-HOST] Started on port ${candidate?.publicPort}, local IPs: ${candidate?.privateIps?.join(',')}, public IP: ${candidate?.publicIp}, UPnP: ${upnpOk ? 'OK' : 'FAIL'}`);

  return {
    success: true,
    token,
    status: manager.status,
    nat: manager.getNatInfo(),
    candidate,
    upnpOk,
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

  // LAN mode: conexión directa al host RetroArch, sin P2P ni forwarder
  // Nota: tras transition('lan_match'), el estado es 'lan_check' (no 'lan_connected')
  if (manager.status === "lan_check") {
    const remote = manager.getRemoteInfo();
    const hostLanIp = remote?.address || hostCandidate.privateIps?.[0] || hostCandidate.publicIp;
    console.log(`[P2P-GUEST] LAN mode directo — hostLanIp=${hostLanIp}`);
    return {
      success: true,
      isLan: true,
      hostLanIp,
      candidate: guestCandidate,
    };
  }

  let forwarderPort: number | null = null;

  // Same-machine: bridge host + skip forwarder (RA habla directo)
  if (hostManager && guestCandidate) {
    await hostManager.manager.onGuestJoin(guestCandidate, token);
  } else {
    // Cross-machine (WAN): crear forwarder
    forwarderPort = await startForwarder(token, manager);
  }

  return {
    success: true,
    token,
    status: manager.status,
    nat: manager.getNatInfo(),
    candidate: guestCandidate,
    hostConnected: !!hostManager,
    forwarderPort,
  };
}

export async function handleP2PGuestWan(hostAddress: string): Promise<any> {
  if (!hostAddress || !hostAddress.includes(':')) {
    return { success: false, error: "Formato inválido. Use IP:puerto (ej: 203.0.113.5:55435)" };
  }

  const [ip, portStr] = hostAddress.trim().split(':');
  const port = parseInt(portStr, 10);
  if (!ip || isNaN(port)) {
    return { success: false, error: "Formato inválido. Use IP:puerto (ej: 203.0.113.5:55435)" };
  }

  const token = tokenCounter++;
  const hostCandidate = {
    peerId: 'host',
    publicIp: ip,
    publicPort: port,
    privateIps: [],
    natType: 'unknown' as any,
    protocolVersion: 1,
  };

  const manager = new P2PManager({
    sessionToken: token,
    callbacks: {
      onStatus: (s: any) => console.log(`[P2P-GUEST-WAN] ${JSON.stringify(s)}`),
      onConnected: (peerId: string, mode: string) =>
        console.log(`[P2P-GUEST-WAN] Connected to ${peerId} via ${mode}`),
      onDisconnected: (peerId: string, reason: string) =>
        console.log(`[P2P-GUEST-WAN] Disconnected: ${reason}`),
      onError: (code: string, msg: string) =>
        console.log(`[P2P-GUEST-WAN] Error ${code}: ${msg}`),
    },
  });

  await manager.startJoinWan(hostCandidate);
  const guestCandidate = await manager.sendCandidate();

  let forwarderPort: number | null = null;

  if (hostManager) {
    await hostManager.manager.onGuestJoin(guestCandidate!, token);
  } else {
    forwarderPort = await startForwarder(token, manager);
  }

  return {
    success: true,
    token,
    status: manager.status,
    nat: manager.getNatInfo(),
    candidate: guestCandidate,
    hostConnected: !!hostManager,
    forwarderPort,
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
  const portToClose = hostManager?.manager.getNatInfo()?.publicPort;
  if (hostManager) {
    try { hostManager.manager.disconnect(); } catch {}
    hostManager = null;
  }
  if (portToClose) {
    tryUnmapPort(portToClose, 'UDP');
  }
  return { success: true };
}
