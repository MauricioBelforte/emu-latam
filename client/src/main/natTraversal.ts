import dgram from "dgram";

// ── Constantes ──────────────────────────────────────────
const STUN_HOST = "stun.l.google.com";
const STUN_PORT = 19302;
const STUN_TIMEOUT_MS = 3000;
const PUNCH_TIMEOUT_MS = 5000;
const KEEPALIVE_INTERVAL_MS = 15000;
const SYMMETRIC_CHECK_COUNT = 2;

// ── Estado interno ──────────────────────────────────────
let punchSocket: dgram.Socket | null = null;
let keepAliveTimer: NodeJS.Timeout | null = null;
let peerEndpoint: { ip: string; port: number } | null = null;

// ── Interfaces ──────────────────────────────────────────
export interface StunResult {
  publicIp: string;
  publicPort: number;
  natType: "unknown" | "symmetric" | "compatible";
}

export interface PunchResult {
  success: boolean;
  localPort: number;
  bridgeSocket?: dgram.Socket;
}

export interface BridgeInfo {
  localPort: number;
}

// ── STUN (RFC 5389) ─────────────────────────────────────

function createStunBindingRequest(): Buffer {
  const buf = Buffer.alloc(20);
  buf.writeUInt16BE(0x0001, 0);                    // Message Type: Binding Request
  buf.writeUInt16BE(0, 2);                         // Message Length (no attributes)
  buf.writeUInt32BE(0x2112A442, 4);                 // Magic Cookie
  for (let i = 0; i < 12; i++) {                    // Transaction ID (random)
    buf[8 + i] = Math.floor(Math.random() * 256);
  }
  return buf;
}

function parseStunResponse(msg: Buffer): { ip: string; port: number } | null {
  if (msg.length < 20) return null;
  const type = msg.readUInt16BE(0);
  if (type !== 0x0101) return null;                 // Not a Binding Response
  const cookie = msg.readUInt32BE(4);
  if (cookie !== 0x2112A442) return null;

  let offset = 20;
  while (offset + 4 <= msg.length) {
    const attrType = msg.readUInt16BE(offset);
    const attrLen = msg.readUInt16BE(offset + 2);
    const valueStart = offset + 4;
    if (attrType === 0x0001) {                       // MAPPED-ADDRESS
      if (valueStart + 8 > msg.length) return null;
      const family = msg.readUInt8(valueStart + 1);
      if (family !== 0x01) return null;              // Solo IPv4
      const port = msg.readUInt16BE(valueStart + 2);
      const ip = `${msg[valueStart + 4]}.${msg[valueStart + 5]}.${msg[valueStart + 6]}.${msg[valueStart + 7]}`;
      return { ip, port };
    }
    offset += 4 + attrLen;
    if (attrLen % 4 !== 0) offset += 4 - (attrLen % 4); // padding alignment
  }
  return null;
}

function stunRequest(host: string, port: number, timeoutMs: number): Promise<{ ip: string; port: number } | null> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const req = createStunBindingRequest();
    let done = false;

    const finish = (result: { ip: string; port: number } | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.close();
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    socket.on("message", (msg) => finish(parseStunResponse(msg)));
    socket.on("error", () => finish(null));
    socket.send(req, port, host);
  });
}

export async function discoverEndpoint(
  stunHost?: string, stunPort?: number
): Promise<StunResult> {
  const host = stunHost || STUN_HOST;
  const port = stunPort || STUN_PORT;

  const results: Array<{ ip: string; port: number } | null> = [];
  for (let i = 0; i < SYMMETRIC_CHECK_COUNT; i++) {
    const r = await stunRequest(host, port, STUN_TIMEOUT_MS);
    results.push(r);
  }

  const valid = results.filter(r => r !== null) as Array<{ ip: string; port: number }>;
  if (valid.length === 0) {
    return { publicIp: "0.0.0.0", publicPort: 0, natType: "unknown" };
  }

  const first = valid[0];
  const symmetric = valid.length > 1 && valid.some(r => r && r.port !== first.port);

  return {
    publicIp: first.ip,
    publicPort: first.port,
    natType: symmetric ? "symmetric" : "compatible",
  };
}

// ── Hole Punching ───────────────────────────────────────

export async function attemptHolePunch(
  localPort: number,
  peerPublicIp: string,
  peerPublicPort: number,
  timeoutMs?: number
): Promise<PunchResult> {
  const timeout = timeoutMs || PUNCH_TIMEOUT_MS;

  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    let done = false;

    const finish = (success: boolean, port: number) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (success) {
        resolve({ success: true, localPort: port, bridgeSocket: socket });
      } else {
        socket.close();
        resolve({ success: false, localPort: port });
      }
    };

    const timer = setTimeout(() => finish(false, localPort), timeout);

    socket.on("message", (msg, rinfo) => {
      if (rinfo.address === peerPublicIp) {
        finish(true, socket.address().port);
      }
    });

    socket.on("error", () => finish(false, localPort));

    socket.bind(localPort, "127.0.0.1", () => {
      const actualPort = socket.address().port;
      peerEndpoint = { ip: peerPublicIp, port: peerPublicPort };
      punchSocket = socket;

      // Enviar paquetes de hole punch periódicamente mientras esperamos
      const punchPayload = Buffer.from("EMU_PUNCH");
      const punchInterval = setInterval(() => {
        if (done) { clearInterval(punchInterval); return; }
        socket.send(punchPayload, peerPublicPort, peerPublicIp);
      }, 200);

      // Enviar inmediatamente
      socket.send(punchPayload, peerPublicPort, peerPublicIp);

      // Limpiar interval si timeout
      timer.unref();
    });
  });
}

// ── Keep-Alive ──────────────────────────────────────────

export function startKeepAlive(intervalMs?: number): boolean {
  if (!punchSocket || !peerEndpoint) return false;
  if (keepAliveTimer) return true;

  const interval = intervalMs || KEEPALIVE_INTERVAL_MS;
  const payload = Buffer.from("EMU_KEEPALIVE");

  keepAliveTimer = setInterval(() => {
    if (punchSocket && peerEndpoint) {
      try {
        punchSocket.send(payload, peerEndpoint.port, peerEndpoint.ip);
      } catch {}
    }
  }, interval);

  return true;
}

export function stopKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

// ── Cleanup ─────────────────────────────────────────────

export function closeAll(): void {
  stopKeepAlive();
  if (punchSocket) {
    try { punchSocket.close(); } catch {}
    punchSocket = null;
  }
  peerEndpoint = null;
}

// ── Bridge (UDP forwarder after hole punch) ─────────────

export function createBridge(bridgeSocket: dgram.Socket, peerIp: string, peerPort: number, localGamePort: number): Promise<BridgeInfo> {
  return new Promise((resolve, reject) => {
    const gameListener = dgram.createSocket("udp4");

    bridgeSocket.on("message", (msg) => {
      gameListener.send(msg, localGamePort, "127.0.0.1");
    });

    gameListener.on("message", (msg) => {
      bridgeSocket.send(msg, peerPort, peerIp);
    });

    gameListener.on("error", (err) => {
      reject(err);
    });

    gameListener.bind(localGamePort, "127.0.0.1", () => {
      resolve({ localPort: gameListener.address().port });
    });
  });
}

export function closeBridge(bridgeSocket?: dgram.Socket): void {
  if (bridgeSocket) {
    try { bridgeSocket.close(); } catch {}
  }
}

export { closeAll as closeNatTraversal };
