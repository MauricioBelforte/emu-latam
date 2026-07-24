import dgram from "dgram";
import os from "os";

const DISCOVERY_PORT = 48888;
const DISCOVERY_MSG = "emu_p2p_sala";
const BROADCAST_INTERVAL = 2000;

let broadcastTimer: ReturnType<typeof setInterval> | null = null;
let discoverySocket: dgram.Socket | null = null;

export function startBroadcast(hostIp: string, port: string): void {
  stopBroadcast();
  const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
  sock.on("error", () => {});
  sock.bind(() => {
    sock.setBroadcast(true);
    const msg = Buffer.from(`${DISCOVERY_MSG}|${hostIp}|${port}`);
    broadcastTimer = setInterval(() => {
      sock.send(msg, 0, msg.length, DISCOVERY_PORT, "255.255.255.255");
    }, BROADCAST_INTERVAL);
  });
  broadcastTimer = setInterval(() => {
    const msg = Buffer.from(`${DISCOVERY_MSG}|${hostIp}|${port}`);
    sock.send(msg, 0, msg.length, DISCOVERY_PORT, "255.255.255.255");
  }, BROADCAST_INTERVAL);
}

export function stopBroadcast(): void {
  if (broadcastTimer) { clearInterval(broadcastTimer); broadcastTimer = null; }
}

export function discoverHost(timeoutMs = 3000): Promise<{ host: string; port: string } | null> {
  return new Promise((resolve) => {
    const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    discoverySocket = sock;
    sock.on("error", () => {});
    sock.on("message", (msg) => {
      const text = msg.toString();
      const parts = text.split("|");
      if (parts[0] === DISCOVERY_MSG && parts[1] && parts[2]) {
        cleanup();
        resolve({ host: parts[1], port: parts[2] });
      }
    });
    sock.bind(DISCOVERY_PORT, () => {
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeoutMs);
    });
    function cleanup() {
      try { sock.close(); } catch {}
      discoverySocket = null;
    }
  });
}

export function stopDiscovery(): void {
  if (discoverySocket) {
    try { discoverySocket.close(); } catch {}
    discoverySocket = null;
  }
}
