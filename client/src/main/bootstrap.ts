import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import type { ChildProcess } from "child_process";

const BORE_TIMEOUT_MS = 12000;

export interface HandlerResult {
  success: boolean;
  roomCode?: string;
  boreUrl?: string;
  error?: string;
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

export function startNakamaBore(): Promise<{ success: boolean; url?: string; error?: string }> {
  return new Promise((resolve) => {
    const borePath = path.join(getRelayDir(), "bore.exe");
    if (!fs.existsSync(borePath)) return resolve({ success: false, error: "bore.exe no encontrado en relay-server/" });

    try { execSync("taskkill /f /im bore.exe 2>nul", { stdio: "ignore" }); } catch {}
    nakamaBoreProcess = null;

    let resolved = false;
    let stderrLog = "";
    let child: ChildProcess;

    try {
      child = spawn(borePath, ["local", "7350", "--to", "bore.pub"], {
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
        resolve({ success: false, error: "Timeout esperando bore Nakama (12s). stderr: " + stderrLog });
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
    console.log("[BOOTSTRAP] Conexión P2P activa:", { roomCode, boreUrl: boreResult.url });
    return { success: true, roomCode, boreUrl: boreResult.url };
  } catch (e: any) {
    return { success: false, error: "Error en bootstrap host: " + String(e) };
  }
}

export async function handleBootstrapGuest(roomCode: string): Promise<HandlerResult> {
  if (!roomCode || roomCode.trim().length < 3) {
    return { success: false, error: "Ingresá el código de sala numérico." };
  }
  try {
    const boreUrl = boreUrlFromRoomCode(roomCode.trim());
    if (!boreUrl) {
      return { success: false, error: "Código inválido. Debe ser un número de puerto (ej: 28734)." };
    }
    let host = boreUrl;
    let port = "7350";
    if (boreUrl.includes(":")) {
      const parts = boreUrl.split(":");
      host = parts[0];
      port = parts[1] || "7350";
    }
    setNakamaConfigRemote(host, port);
    console.log("[BOOTSTRAP] Guest configurado para Nakama remoto:", { host, port });
    return { success: true, boreUrl };
  } catch (e: any) {
    return { success: false, error: "Error en bootstrap guest: " + String(e) };
  }
}

export async function handleBootstrapClose(): Promise<HandlerResult> {
  stopNakamaBore();
  restoreNakamaLocalhost();
  console.log("[BOOTSTRAP] Conexión P2P cerrada");
  return { success: true };
}
