import https from "https";
import http from "http";
import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import type { ChildProcess } from "child_process";

const PASTE_API_HOST = "dpaste.org";
const PASTE_API_PATH = "/api/";
const BORE_TIMEOUT_MS = 12000;
const HTTP_TIMEOUT_MS = 6000;

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

function httpsPost(urlPath: string, data: string, host: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host || PASTE_API_HOST,
      path: urlPath,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(data),
      },
      timeout: HTTP_TIMEOUT_MS,
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk.toString());
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(data);
    req.end();
  });
}

function httpsGet(url: string, host: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host || PASTE_API_HOST,
      path: url,
      method: "GET",
      timeout: HTTP_TIMEOUT_MS,
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk.toString());
      res.on("end", () => {
        if (res.statusCode === 404) reject(new Error("Room code inválido o expirado (404)"));
        else if (res.statusCode && res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 100)}`));
        else resolve(body.trim());
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

export async function publishBoreUrl(boreUrl: string): Promise<{ success: boolean; roomCode?: string; error?: string }> {
  try {
    const postData = `content=${encodeURIComponent(boreUrl)}&title=emu-sala&expiry_days=1`;
    const body = await httpsPost(PASTE_API_PATH, postData, PASTE_API_HOST);
    const hashMatch = body.match(/dpaste\.org\/([a-zA-Z0-9]+)/);
    if (!hashMatch) return { success: false, error: "No se pudo extraer room code de dpaste: " + body.slice(0, 100) };
    const roomCode = hashMatch[1];
    if (!roomCode || roomCode.length < 4) return { success: false, error: "Room code muy corto: " + roomCode };
    return { success: true, roomCode };
  } catch (e: any) {
    return { success: false, error: "Error publicando en dpaste: " + (e.message || String(e)) };
  }
}

export async function fetchBoreUrl(roomCode: string): Promise<{ success: boolean; boreUrl?: string; error?: string }> {
  if (!roomCode || roomCode.trim().length < 3) {
    return { success: false, error: "Room code inválido. Ingresá el código de 6 caracteres." };
  }
  try {
    const rawPath = `/${roomCode.trim()}/raw/`;
    const body = await httpsGet(rawPath, PASTE_API_HOST);
    if (!body || !body.includes(":")) return { success: false, error: "Respuesta inválida del paste service: " + (body || "vacía") };
    return { success: true, boreUrl: body };
  } catch (e: any) {
    return { success: false, error: "Error obteniendo URL: " + (e.message || String(e)) };
  }
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
    const publishResult = await publishBoreUrl(boreResult.url);
    if (!publishResult.success) {
      return {
        success: true,
        boreUrl: boreResult.url,
        error: "Sala pública sin código automático: " + (publishResult.error || "error publicando") + ". Compartí esta URL manualmente: " + boreResult.url,
      };
    }
    console.log("[BOOTSTRAP] Sala pública activa:", { roomCode: publishResult.roomCode, boreUrl: boreResult.url });
    return { success: true, roomCode: publishResult.roomCode, boreUrl: boreResult.url };
  } catch (e: any) {
    return { success: false, error: "Error en bootstrap host: " + String(e) };
  }
}

export async function handleBootstrapGuest(roomCode: string): Promise<HandlerResult> {
  if (!roomCode || roomCode.trim().length < 3) {
    return { success: false, error: "Ingresá el código de sala de 6 caracteres." };
  }
  try {
    const fetchResult = await fetchBoreUrl(roomCode.trim());
    if (!fetchResult.success || !fetchResult.boreUrl) {
      return { success: false, error: fetchResult.error || "No se pudo obtener la URL del host" };
    }
    const boreUrl = fetchResult.boreUrl;
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
  console.log("[BOOTSTRAP] Sala pública cerrada");
  return { success: true };
}
