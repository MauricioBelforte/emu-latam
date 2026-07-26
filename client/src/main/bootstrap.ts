import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import net from "net";
import os from "os";
import type { ChildProcess } from "child_process";

const BORE_TIMEOUT_MS = 15000;
const BORE_MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 3000, 5000];

export interface HandlerResult {
  success: boolean;
  roomCode?: string;
  boreUrl?: string;
  error?: string;
  warning?: string;
  lanIp?: string;
}

let nakamaBoreProcess: ChildProcess | null = null;

function getProjectRoot(): string {
  const { app } = require("electron");
  if (app.isPackaged) return path.join(process.resourcesPath, "extraResources");
  return path.resolve(__dirname, "../../..");
}

function getNakamaConfigPath(): string {
  return path.join(getProjectRoot(), "emu_latam_nakama.json");
}

function getRelayDir(): string {
  return path.join(getProjectRoot(), "relay-server");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function generateRoomCode(boreUrl: string): string {
  const match = boreUrl.match(/:(\d+)$/);
  return match ? match[1] : "";
}

export function boreUrlFromRoomCode(roomCode: string): string | null {
  const port = parseInt(roomCode.trim(), 10);
  if (isNaN(port) || port < 1024 || port > 65535) return null;
  return `bore.pub:${port}`;
}

export function setNakamaConfigRemote(host: string, port: string): void {
  try {
    fs.writeFileSync(getNakamaConfigPath(), JSON.stringify({ host, port }, null, 2), "utf8");
    console.log("[BOOTSTRAP] Nakama config remota:", { host, port });
  } catch (e) {
    console.error("[BOOTSTRAP] Error guardando config Nakama remota:", e);
  }
}

export function restoreNakamaLocalhost(): void {
  try {
    fs.writeFileSync(getNakamaConfigPath(), JSON.stringify({ host: "127.0.0.1", port: "7350" }, null, 2), "utf8");
    console.log("[BOOTSTRAP] Nakama config restaurada a localhost");
  } catch (e) {
    console.error("[BOOTSTRAP] Error restaurando Nakama localhost:", e);
  }
}

const BORE_PREFERRED_PORTS = [8080, 8888, 8443, 9000];

function spawnBoreOnce(preferredPort?: number): Promise<{ success: boolean; url?: string; error?: string }> {
  return new Promise((resolve) => {
    const borePath = path.join(getRelayDir(), "bore.exe");
    if (!fs.existsSync(borePath)) return resolve({ success: false, error: "bore.exe no encontrado en relay-server/" });

    try { execSync("taskkill /f /im bore.exe 2>nul", { stdio: "ignore" }); } catch {}
    nakamaBoreProcess = null;

    let resolved = false;
    let stderrLog = "";
    let child: ChildProcess;

    const args = ["local", "7350", "--to", "bore.pub"];
    if (preferredPort) args.push("--port", String(preferredPort));

    try {
      child = spawn(borePath, args, {
        cwd: getRelayDir(),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e: any) {
      return resolve({ success: false, error: "Error al spawn bore: " + String(e) });
    }

    if (!child.stdout) return resolve({ success: false, error: "bore stdout no disponible" });
    nakamaBoreProcess = child;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (nakamaBoreProcess) nakamaBoreProcess.kill();
        resolve({ success: false, error: "Timeout esperando bore Nakama (15s). stderr: " + stderrLog });
      }
    }, BORE_TIMEOUT_MS);

    child.stdout.on("data", (data: Buffer) => {
      try {
        const output = data.toString().trim();
        console.log(`[BORE NAKAMA] ${output}`);
        const match = output.match(/listening at ([\w.-]+:\d+)/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ success: true, url: match[1] });
        }
      } catch {}
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderrLog += data.toString().trim() + " | ";
    });

    child.on("error", (err) => {
      if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ success: false, error: err.message + " | stderr: " + stderrLog }); }
    });

    child.on("close", (code) => {
      nakamaBoreProcess = null;
      if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ success: false, error: `bore terminó con código ${code} | stderr: ${stderrLog}` }); }
    });
  });
}

export async function startNakamaBore(): Promise<{ success: boolean; url?: string; error?: string }> {
  let lastError = "";

  // Primero intenta con puertos preferidos (menos bloqueados por carriers)
  for (const port of BORE_PREFERRED_PORTS) {
    console.log(`[BOOTSTRAP] Intentando bore con puerto preferido ${port}...`);
    const result = await spawnBoreOnce(port);
    if (result.success) {
      console.log(`[BOOTSTRAP] bore conectado con puerto preferido ${port}: ${result.url}`);
      return result;
    }
    lastError = result.error || `Puerto ${port} no disponible`;
    console.log(`[BOOTSTRAP] Puerto ${port} falló: ${lastError}`);
  }

  console.log("[BOOTSTRAP] Puertos preferidos agotados, usando puerto aleatorio...");
  for (let attempt = 0; attempt < BORE_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[BOOTSTRAP] Reintentando bore aleatorio (intento ${attempt + 1}/${BORE_MAX_RETRIES}) en ${RETRY_DELAYS[attempt]}ms...`);
      await sleep(RETRY_DELAYS[attempt]);
    }

    const result = await spawnBoreOnce();
    if (result.success) return result;

    lastError = result.error || "Error desconocido";
    console.log(`[BOOTSTRAP] Intento aleatorio ${attempt + 1} falló: ${lastError}`);
  }

  return { success: false, error: `bore falló tras todos los intentos. Último error: ${lastError}` };
}

export function stopNakamaBore(): void {
  if (nakamaBoreProcess) {
    try { nakamaBoreProcess.kill(); } catch {}
    nakamaBoreProcess = null;
  }
  try { execSync("taskkill /f /im bore.exe 2>nul", { stdio: "ignore" }); } catch {}
  console.log("[BOOTSTRAP] bore Nakama detenido");
}

export async function handleBootstrapHost(): Promise<HandlerResult> {
  try {
    const boreResult = await startNakamaBore();
    if (!boreResult.success || !boreResult.url) {
      return { success: false, error: boreResult.error || "No se pudo iniciar bore para Nakama" };
    }
    const roomCode = generateRoomCode(boreResult.url);
    if (!roomCode) {
      return { success: true, boreUrl: boreResult.url, error: "No se pudo generar código de la URL: " + boreResult.url };
    }
    let lanIp = "";
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
          if (iface.family === "IPv4" && !iface.internal && name !== "Tailscale") {
            lanIp = iface.address; break;
          }
        }
        if (lanIp) break;
      }
    } catch {}
    console.log("[BOOTSTRAP] Conexión P2P activa:", { roomCode, boreUrl: boreResult.url, lanIp });
    return { success: true, roomCode, boreUrl: boreResult.url, lanIp };
  } catch (e: any) {
    return { success: false, error: "Error en bootstrap host: " + String(e) };
  }
}

function testTcpConnect(host: string, port: number, timeoutMs = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let resolved = false;
    const done = (err?: string) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      sock.destroy();
      resolve(err || null);
    };
    const timer = setTimeout(() => done(`Timeout conectando a ${host}:${port} (${timeoutMs}ms)`), timeoutMs);
    sock.on("connect", () => done());
    sock.on("error", (e) => done(`No se puede alcanzar ${host}:${port} — ${e.message}`));
    sock.connect(port, host);
  });
}

export async function handleBootstrapGuest(roomCode: string, lanIp?: string): Promise<HandlerResult> {
  if (!roomCode || roomCode.trim().length < 3) {
    return { success: false, error: "Ingresá el código de sala numérico." };
  }
  try {
    let host = "bore.pub";
    let port = roomCode.trim();
    if (lanIp && !boreUrlFromRoomCode(roomCode.trim())) {
      host = lanIp;
      port = "7350";
    } else {
      const boreUrl = boreUrlFromRoomCode(roomCode.trim());
      if (!boreUrl) {
        return { success: false, error: "Código inválido. Debe ser un número de puerto (ej: 28734)." };
      }
      if (boreUrl.includes(":")) {
        const parts = boreUrl.split(":");
        host = parts[0];
        port = parts[1] || "7350";
      }
    }
    const tcpErr = await testTcpConnect(host, parseInt(port, 10));
    setNakamaConfigRemote(host, port);
    console.log("[BOOTSTRAP] Guest configurado para Nakama:", { host, port, lanIp: !!lanIp });
    if (tcpErr) {
      console.warn("[BOOTSTRAP] TCP test falló (no bloqueante):", tcpErr);
      return { success: true, boreUrl: `${host}:${port}`, warning: `${tcpErr}. La conexión Nakama puede fallar, pero se configuró igual. Probá presionar INSERT COIN.` };
    }
    return { success: true, boreUrl: `${host}:${port}` };
  } catch (e: any) {
    return { success: false, error: "Error en bootstrap guest: " + String(e) };
  }
}

let gameBoreProcess: ChildProcess | null = null;

export function startGameBoreTunnel(): Promise<{ success: boolean; url?: string; error?: string }> {
  return new Promise((resolve) => {
    const borePath = path.join(getRelayDir(), "bore.exe");
    if (!fs.existsSync(borePath)) return resolve({ success: false, error: "bore.exe no encontrado en relay-server/" });

    if (gameBoreProcess) { try { gameBoreProcess.kill(); } catch {} }
    gameBoreProcess = null;

    let resolved = false;
    let stderrLog = "";
    let child: ChildProcess;

    try {
      child = spawn(borePath, ["local", "55436", "--to", "bore.pub"], {
        cwd: getRelayDir(),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e: any) {
      return resolve({ success: false, error: "Error al spawn bore: " + String(e) });
    }

    if (!child.stdout) return resolve({ success: false, error: "bore stdout no disponible" });
    gameBoreProcess = child;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (gameBoreProcess) gameBoreProcess.kill();
        resolve({ success: false, error: "Timeout esperando bore game relay (15s). stderr: " + stderrLog });
      }
    }, 15000);

    child.stdout.on("data", (data: Buffer) => {
      try {
        const output = data.toString().trim();
        console.log(`[BORE GAME] ${output}`);
        const match = output.match(/listening at ([\w.-]+:\d+)/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ success: true, url: match[1] });
        }
      } catch {}
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderrLog += data.toString().trim() + " | ";
    });

    child.on("error", (err) => {
      if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ success: false, error: err.message + " | stderr: " + stderrLog }); }
    });

    child.on("close", (code) => {
      gameBoreProcess = null;
      if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ success: false, error: `bore game termin con cdigo ${code} | stderr: ${stderrLog}` }); }
    });
  });
}

export function stopGameBoreTunnel(): void {
  if (gameBoreProcess) {
    try { gameBoreProcess.kill(); } catch {}
    gameBoreProcess = null;
  }
  console.log("[BOOTSTRAP] bore game relay detenido");
}

export async function handleBootstrapClose(): Promise<HandlerResult> {
  stopNakamaBore();
  restoreNakamaLocalhost();
  console.log("[BOOTSTRAP] Conexin P2P cerrada");
  return { success: true };
}
