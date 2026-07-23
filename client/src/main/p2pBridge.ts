import path from "path";
import fs from "fs";
import { P2PManager } from "../../../p2p-module/src/index";

const P2P_DIR = path.resolve(__dirname, "../../../../relay-server");
const P2P_HOST_FILE = path.join(P2P_DIR, "p2p_host_candidate.json");
const P2P_GUEST_FILE = path.join(P2P_DIR, "p2p_guest_candidate.json");

interface StoredManager {
  manager: P2PManager;
  token: number;
}

let hostManager: StoredManager | null = null;

function ensureDir(): void {
  if (!fs.existsSync(P2P_DIR)) fs.mkdirSync(P2P_DIR, { recursive: true });
}

function saveJson(filePath: string, data: any): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function readJson(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch { return null; }
}

function deleteFile(filePath: string): void {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

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
  saveJson(P2P_HOST_FILE, candidate);

  return {
    success: true,
    token,
    status: manager.status,
    nat: manager.getNatInfo(),
    candidate,
  };
}

export async function handleP2PGuest(hostCandidateFromFront?: any): Promise<any> {
  const hostCand = hostCandidateFromFront ?? readJson(P2P_HOST_FILE);
  if (!hostCand) {
    return { success: false, error: "No host candidate. Run HOST P2P first or paste candidate data." };
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

  await manager.startJoin(hostCand);
  const guestCandidate = await manager.sendCandidate();

  saveJson(P2P_GUEST_FILE, guestCandidate);

  if (hostManager && guestCandidate) {
    await hostManager.manager.onGuestJoin(guestCandidate, token);
    return {
      success: true,
      token,
      status: manager.status,
      nat: manager.getNatInfo(),
      candidate: guestCandidate,
      hostConnected: true,
    };
  }

  return {
    success: true,
    token,
    status: manager.status,
    nat: manager.getNatInfo(),
    candidate: guestCandidate,
    hostConnected: false,
  };
}

export function handleP2PDisconnect(): any {
  if (hostManager) {
    try { hostManager.manager.disconnect(); } catch {}
    hostManager = null;
  }
  deleteFile(P2P_HOST_FILE);
  deleteFile(P2P_GUEST_FILE);
  return { success: true };
}

export function handleP2PReadHostCandidate(): any {
  return readJson(P2P_HOST_FILE);
}
