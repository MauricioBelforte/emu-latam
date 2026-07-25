import dgram from "dgram";
import net from "net";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import type { ChildProcess } from "child_process";

const BORE_TIMEOUT = 12000;

let ggpoHostBoreProc: ChildProcess | null = null;
let ggpoHostTcpServer: net.Server | null = null;
let ggpoHostUdpRelay: dgram.Socket | null = null;
let ggpoGuestTcpSocket: net.Socket | null = null;
let ggpoGuestUdpForwarder: dgram.Socket | null = null;

function getRelayDir(): string {
  const { app } = require("electron");
  const root = app.isPackaged ? path.join(process.resourcesPath, "extraResources") : path.resolve(__dirname, "../../..");
  return path.join(root, "relay-server");
}

function startBoreTunnel(localPort: number): Promise<string | null> {
  return new Promise((resolve) => {
    const borePath = path.join(getRelayDir(), "bore.exe");
    if (!fs.existsSync(borePath)) return resolve(null);

    if (ggpoHostBoreProc) { try { ggpoHostBoreProc.kill(); } catch {} }
    ggpoHostBoreProc = null;

    let resolved = false;
    let child: ChildProcess;

    try {
      child = spawn(borePath, ["local", String(localPort), "--to", "bore.pub"], {
        cwd: getRelayDir(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      });
    } catch { return resolve(null); }

    if (!child.stdout) return resolve(null);
    ggpoHostBoreProc = child;

    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; child.kill(); resolve(null); }
    }, BORE_TIMEOUT);

    child.stdout.on("data", (data: Buffer) => {
      const m = data.toString().trim().match(/listening at ([\w.-]+:\d+)/);
      if (m && !resolved) { resolved = true; clearTimeout(timeout); resolve(m[1]); }
    });
    child.on("error", () => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve(null); } });
    child.on("close", () => { ggpoHostBoreProc = null; if (!resolved) { resolved = true; clearTimeout(timeout); resolve(null); } });
  });
}

export async function handleBootstrapGgpoRelayHost(targetUdpPort: number = 6003): Promise<any> {
  try {
    // 1. UDP relay: host emulator envía datos aquí ↔ se reenvían por TCP
    const udpRelay = dgram.createSocket("udp4");
    const relayPort = await new Promise<number>((resolve, reject) => {
      udpRelay.on("message", (msg) => {
        // Data from host emulator → forward to TCP clients
      });
      udpRelay.on("error", reject);
      udpRelay.bind(0, "127.0.0.1", () => resolve(udpRelay.address().port));
    });
    ggpoHostUdpRelay = udpRelay;

    // 2. TCP server: bridge between bore tunnel and UDP relay
    const tcpClients = new Set<net.Socket>();
    const tcpServer = net.createServer((socket) => {
      socket.setNoDelay(true);
      tcpClients.add(socket);

      // TCP from guest → reenviar al emulador host (targetUdpPort)
      socket.on("data", (data) => {
        const tmp = dgram.createSocket("udp4");
        tmp.send(data, targetUdpPort, "127.0.0.1", () => { try { tmp.close(); } catch {} });
      });

      socket.on("close", () => tcpClients.delete(socket));
      socket.on("error", () => tcpClients.delete(socket));
    });

    const tcpPort = await new Promise<number>((resolve, reject) => {
      tcpServer.on("error", reject);
      tcpServer.listen(0, "127.0.0.1", () => {
        const a = tcpServer.address();
        if (a && typeof a === "object") resolve(a.port);
        else reject(new Error("No address"));
      });
    });
    ggpoHostTcpServer = tcpServer;

    // Wire UDP → TCP (data from host emulator goes to TCP clients)
    udpRelay.on("message", (msg) => {
      for (const c of tcpClients) {
        if (c.writable) c.write(msg);
      }
    });

    console.log(`[GGPO-RELAY] Host: UDP relay :${relayPort} → target :${targetUdpPort} ↔ TCP :${tcpPort} → bore`);

    // 3. Start bore tunnel for TCP port
    const boreUrl = await startBoreTunnel(tcpPort);
    if (!boreUrl) {
      udpRelay.close();
      tcpServer.close();
      ggpoHostUdpRelay = null;
      ggpoHostTcpServer = null;
      return { success: false, error: "bore tunnel failed for GGPO relay" };
    }

    return { success: true, relayPort, boreUrl };
  } catch (e: any) {
    console.error("[GGPO-RELAY] Host error:", e);
    return { success: false, error: String(e) };
  }
}

export async function handleBootstrapGgpoRelayGuest(forwarderUdpPort: number, boreUrl: string, targetUdpPort: number = 6004): Promise<any> {
  try {
    // 1. Connect TCP to bore endpoint
    const parts = boreUrl.split(":");
    const boreHost = parts[0];
    const borePort = parseInt(parts[1] || "7350", 10);

    const tcpSocket = new net.Socket();
    tcpSocket.setNoDelay(true);
    ggpoGuestTcpSocket = tcpSocket;

    // 2. Bridge: TCP from host → UDP to emulador guest (targetUdpPort)
    tcpSocket.on("data", (data) => {
      const tmp = dgram.createSocket("udp4");
      tmp.send(data, targetUdpPort, "127.0.0.1", () => { try { tmp.close(); } catch {} });
    });

    tcpSocket.on("close", () => { cleanupGuest(); });
    tcpSocket.on("error", () => { cleanupGuest(); });

    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("Timeout con " + boreUrl)), 10000);
      tcpSocket.connect(borePort, boreHost, () => { clearTimeout(to); resolve(); });
      tcpSocket.once("error", (e) => { clearTimeout(to); reject(e); });
    });

    // 3. UDP forwarder: GGPO guest (6004) envía datos aquí → TCP
    const udpForwarder = dgram.createSocket("udp4");
    udpForwarder.on("message", (msg) => {
      if (tcpSocket.writable) tcpSocket.write(msg);
    });
    udpForwarder.bind(forwarderUdpPort, "127.0.0.1");
    ggpoGuestUdpForwarder = udpForwarder;

    console.log(`[GGPO-RELAY] Guest: TCP connected to ${boreUrl}, UDP forwarder :${forwarderUdpPort} → TCP`);

    return { success: true };
  } catch (e: any) {
    console.error("[GGPO-RELAY] Guest error:", e);
    cleanupGuest();
    return { success: false, error: String(e) };
  }
}

function cleanupGuest(): void {
  if (ggpoGuestTcpSocket) { try { ggpoGuestTcpSocket.destroy(); } catch {} ggpoGuestTcpSocket = null; }
  if (ggpoGuestUdpForwarder) { try { ggpoGuestUdpForwarder.close(); } catch {} ggpoGuestUdpForwarder = null; }
}

export function handleBootstrapGgpoRelayCleanup(): void {
  if (ggpoHostBoreProc) { try { ggpoHostBoreProc.kill(); } catch {} ggpoHostBoreProc = null; }
  if (ggpoHostTcpServer) { try { ggpoHostTcpServer.close(); } catch {} ggpoHostTcpServer = null; }
  if (ggpoHostUdpRelay) { try { ggpoHostUdpRelay.close(); } catch {} ggpoHostUdpRelay = null; }
  cleanupGuest();
  console.log("[GGPO-RELAY] Cleanup completo");
}
