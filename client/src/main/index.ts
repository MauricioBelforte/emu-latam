import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { spawn, execSync } from "child_process";
import dns from "dns";
import os from "os";
import fs from "fs";
import http from "http";
import net from "net";
import type { ChildProcess } from "child_process";

const LOG_DIR = path.resolve(__dirname, "../../../logs");
const LOG_ROTATED_DIR = path.join(LOG_DIR, "rotated");
const LOG_FILE = path.join(LOG_DIR, "main_process.log");
const MAX_LOG_SIZE = 500 * 1024; // 500KB

// Asegurar que existan las carpetas de logs
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
if (!fs.existsSync(LOG_ROTATED_DIR)) fs.mkdirSync(LOG_ROTATED_DIR, { recursive: true });

function rotateLogIfNeeded(): void {
  try {
    const stats = fs.statSync(LOG_FILE);
    if (stats.size >= MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const rotatedFiles = fs.readdirSync(LOG_ROTATED_DIR)
        .filter(f => f.startsWith('main_process-') && f.endsWith('.log'))
        .sort();
      const nextIndex = rotatedFiles.length + 1;
      const rotatedFileName = `main_process-${timestamp}.log`;
      const rotatedFilePath = path.join(LOG_ROTATED_DIR, rotatedFileName);
      
      fs.renameSync(LOG_FILE, rotatedFilePath);
      console.log(`[LOG ROTATION] Rotated log to ${rotatedFilePath} (size: ${stats.size} bytes)`);
    }
  } catch (err) {
    // Si el archivo no existe, es normal en el primer inicio
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`[LOG ROTATION ERROR] ${err}`);
    }
  }
}

rotateLogIfNeeded();

const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
const origLog = console.log;
const origError = console.error;
console.log = (...args) => {
  origLog(...args);
  logStream.write(`[LOG ${new Date().toISOString()}] ${args.join(" ")}\n`);
  rotateLogIfNeeded();
};
console.error = (...args) => {
  origError(...args);
  logStream.write(`[ERR ${new Date().toISOString()}] ${args.join(" ")}\n`);
  rotateLogIfNeeded();
};
console.log("=== MAIN PROCESS STARTED ===");

let nakamaProcess: ChildProcess | null = null;
let boreProcess: ChildProcess | null = null;
let mitmRelayProcess: ChildProcess | null = null;

process.on("uncaughtException", (err) => {
  if (err instanceof Error && err.message.includes("EPIPE")) return;
  console.error("Uncaught exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

function getProjectRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "extraResources");
  }
  return path.resolve(__dirname, "../../..");
}

function waitForPort(port: number, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const socket = new net.Socket();
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() < deadline) setTimeout(check, 200);
        else resolve(false);
      });
      socket.connect(port, "127.0.0.1");
    };
    check();
  });
}

function waitForPortClosed(port: number, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const socket = new net.Socket();
      socket.once("connect", () => { socket.destroy(); if (Date.now() < deadline) setTimeout(check, 200); else resolve(false); });
      socket.once("error", () => { socket.destroy(); resolve(true); });
      socket.connect(port, "127.0.0.1");
    };
    check();
  });
}

async function isNakamaRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:7350", (res) => { resolve(true); res.resume(); });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

function launchNakama(): void {
  const projectRoot = getProjectRoot();
  const nakamaDir = path.join(projectRoot, "backend");
  const nakamaPath = path.join(nakamaDir, "nakama.exe");
  if (!fs.existsSync(nakamaPath)) { console.error("❌ Nakama server not found at:", nakamaPath); return; }
  isNakamaRunning().then((running) => {
    if (running) { console.log("✅ Nakama is already running."); return; }
    console.log("🚀 Launching Nakama (Hidden Mode)...");
    nakamaProcess = spawn(nakamaPath, ["--config", "local.yml"], { cwd: nakamaDir, windowsHide: true, stdio: "ignore" });
    nakamaProcess.on("error", (err) => console.error("❌ Failed to start Nakama:", err));
    if (nakamaProcess.pid) console.log(`✅ Nakama started (PID: ${nakamaProcess.pid})`);
  });
}

function createWindow(sessionName = "default"): void {
  if (!app.requestSingleInstanceLock()) {
    const randomSuffix = Math.floor(Math.random() * 1000);
    app.setPath("userData", path.join(app.getPath("userData"), `dev-instance-${randomSuffix}`));
  }
  const prefs: Electron.WebPreferences = {
    preload: path.join(__dirname, "../preload/index.js"),
    sandbox: false,
    contextIsolation: true,
  };
  if (sessionName !== "default") prefs.partition = `persist:${sessionName}`;
  const mainWindow = new BrowserWindow({ width: 1400, height: 900, show: true, autoHideMenuBar: true, webPreferences: prefs });
  mainWindow.webContents.openDevTools();
  mainWindow.focus();
  if (process.env["ELECTRON_RENDERER_URL"]) mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  else mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

// Proxy TCP: redirige conexiones locales a un host remoto
let proxyServers: net.Server[] = [];
let forwarderServers: net.Server[] = [];

function startProxy(targetHost: string, targetPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((localSocket) => {
      console.log(`🔌 Proxy: conexión entrante, redirigiendo a ${targetHost}:${targetPort}`);
      const remoteSocket = new net.Socket();
      localSocket.setNoDelay(true);
      remoteSocket.setNoDelay(true);
      remoteSocket.connect(targetPort, targetHost, () => {
        localSocket.pipe(remoteSocket);
        remoteSocket.pipe(localSocket);
      });
      remoteSocket.on("error", (err) => {
        console.error(`🔥 Proxy: error remoto: ${err.message}`);
        localSocket.destroy();
      });
      localSocket.on("error", (err) => {
        if (err.message.includes("ECONNRESET")) return;
        console.error(`🔥 Proxy: error local: ${err.message}`);
        remoteSocket.destroy();
      });
    });
    server.listen(55435, "127.0.0.1", () => {
      proxyServers.push(server);
      console.log(`✅ Proxy TCP en 127.0.0.1:55435 → ${targetHost}:${targetPort}`);
      resolve(55435);
    });
    server.on("error", (err) => { console.error("❌ Proxy: error de listen:", err); reject(err); });
  });
}

function stopAllProxies(): void {
  for (const s of proxyServers) { try { s.close(); } catch {} }
  proxyServers = [];
}

// Forwarder: escucha en listenPort, reenvía a 127.0.0.1:targetPort
// Útil para que bore (que usa 55436) pueda alcanzar al host RA (55435)
function getLanIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

function getTailscaleIp(): string | null {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name]!) {
      if (iface.family === "IPv4" && iface.address.startsWith("100.") && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

function startPortForwarder(listenPort: number, targetPort: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const targetIp = getLanIp();
    const server = net.createServer((incoming) => {
      console.log(`🔁 Forwarder: conexión en ${listenPort} → ${targetIp}:${targetPort}`);
      const target = new net.Socket();
      incoming.setNoDelay(true);
      target.setNoDelay(true);
      target.connect(targetPort, targetIp, () => {
        incoming.pipe(target);
        target.pipe(incoming);
      });
      target.on("error", (err) => { console.error(`🔥 Forwarder: error target: ${err.message}`); incoming.destroy(); });
      incoming.on("error", (err) => { if (!err.message.includes("ECONNRESET")) console.error(`🔥 Forwarder: error incoming: ${err.message}`); target.destroy(); });
    });
    server.listen(listenPort, "127.0.0.1", () => {
      forwarderServers.push(server);
      console.log(`✅ Forwarder activo: ${listenPort} → ${targetPort}`);
      resolve();
    });
    server.on("error", reject);
  });
}

function stopAllForwarders(): void {
  for (const s of forwarderServers) { try { s.close(); } catch {} }
  forwarderServers = [];
}

app.whenReady().then(() => {
  ipcMain.handle("launch-game", async (_event, args) => {
    const { isHost, useRelay, relayIp, relayUrl } = args;
    const projectRoot = getProjectRoot();
    const retroArchDir = path.join(projectRoot, "retroarch");
    const retroArchPath = path.join(retroArchDir, "retroarch.exe");
    const corePath = path.join(retroArchDir, "cores", "fbneo_libretro.dll");
    const romPath = path.join(retroArchDir, "roms", "kof98.zip");
    console.log("🎮 SISTEMA DE LANZAMIENTO");
    if (!fs.existsSync(retroArchPath)) return { success: false, error: "EXE no existe" };
    const spawnArgs = ["-L", corePath, romPath];
    const optimizedCfg = path.join(retroArchDir, "netplay_optimized.cfg");
    if (fs.existsSync(optimizedCfg)) { spawnArgs.push("--appendconfig", optimizedCfg); }
    if (useRelay) {
      if (isHost) {
        // Host con relay: escucha en 55435, forwarder 55436→55435
        // para que bore pueda reenviar a 55436 sin conflicto con proxy del guest
        spawnArgs.push("--host", "--port", "55435");
        await startPortForwarder(55436, 55435);
      } else {
        // Guest con relay: necesita proxy porque RetroArch ignora --port en client mode
        let connectHost = relayIp;
        let connectPort = 55435;
        if (relayIp && relayIp.includes(":")) {
          const parts = relayIp.split(":");
          connectHost = parts[0];
          connectPort = parseInt(parts[1], 10);
        }
        // Si es conexión local directa (127.0.0.1:55435), no necesita proxy
        if (connectHost === "127.0.0.1" && connectPort === 55435) {
          spawnArgs.push("--connect", "127.0.0.1", "--port", "55435");
        } else {
          // Resolver hostname a IPv4
          if (connectHost && !connectHost.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            try {
              const addresses = await dns.promises.resolve4(connectHost);
              if (addresses && addresses.length > 0) {
                console.log(`🌐 ${connectHost} resuelto a IPv4: ${addresses[0]}`);
                connectHost = addresses[0];
              }
            } catch (e) {
              console.error(`⚠️ No se pudo resolver ${connectHost}:`, e);
            }
          }
          // Iniciar proxy local en 55435 → relayHost:relayPort
          await startProxy(connectHost, connectPort);
          // RA conecta a 127.0.0.1 (puerto 55435), que es el proxy
          spawnArgs.push("--connect", "127.0.0.1");
        }
      }
    } else {
      if (isHost) spawnArgs.push("--host", "--port", "55435");
      else spawnArgs.push("--connect", "127.0.0.1", "--port", "55435");
    }
    try {
      console.log("🚀 SPAWNING:", retroArchPath, spawnArgs.join(" "));
      const child = spawn(retroArchPath, spawnArgs, { cwd: retroArchDir, detached: true, stdio: ["ignore", "pipe", "pipe"] });
      child.on("error", (err) => console.error("❌ FALLO DE SPAWN:", err));
      child.on("close", (code) => {
        console.log(`🛑 RetroArch exited with code ${code}`);
        if (isHost) stopAllForwarders();
        else stopAllProxies();
        if (code !== null && code !== undefined) console.error(`🔥 RetroArch terminó con código ${code} — posible error de conexión`);
      });
      child.stdout?.on("data", (data) => { try { console.log(`💬 [RETROARCH]: ${data}`); } catch {} });
      child.stderr?.on("data", (data) => { try { console.error(`🔥 [RETROARCH]: ${data}`); } catch {} });
      child.stdout?.on("error", () => {});
      child.stderr?.on("error", () => {});
      child.unref();
      if (child.pid) {
        console.log(`✅ RetroArch lanzado (PID: ${child.pid})`);
        if (isHost) {
          // RA siempre escucha en 55435 (--port y netplay_port son ignorados)
          console.log(`⏳ Esperando puerto 55435 (host RA)...`);
          const portReady = await waitForPort(55435, 8000);
          if (!portReady) console.error(`❌ Puerto 55435 no disponible después de 8s`);
          else {
            console.log(`✅ Puerto 55435 listo`);
            if (relayUrl) {
              const relayFilePath = path.join(getProjectRoot(), "relay-server", "active_relay.txt");
              fs.writeFileSync(relayFilePath, relayUrl, "utf8");
              console.log("✅ Relay URL guardada en archivo (host listo):", relayUrl);
            }
          }
        }
        let myIp = "127.0.0.1";
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
          for (const net of nets[name]!) {
            if (net.family === "IPv4" && !net.internal) { myIp = net.address; break; }
          }
        }
        return { success: true, myIp };
      }
      return { success: false, error: "No se obtuvo PID" };
    } catch (e) { console.error("❌ EXCEPCION:", e); return { success: false, error: String(e) }; }
  });

  ipcMain.handle("start-relay-tunnel", async () => {
    return new Promise(async (resolve) => {
      const projectRoot = getProjectRoot();
      const relayDir = path.join(projectRoot, "relay-server");
      const borePath = path.join(relayDir, "bore.exe");
      if (!fs.existsSync(borePath)) return resolve({ success: false, error: "Bore no encontrado" });
      
      // Matar cualquier bore previo forzosamente
      try { execSync("taskkill /f /im bore.exe 2>nul", { stdio: "ignore" }); } catch {}
      await new Promise(r => setTimeout(r, 1500));

      console.log("🚀 Spawning Bore Tunnel...");
      let resolved = false;
      let boreChild;
      let stderrLog = "";
      try {
        boreChild = spawn(borePath, ["local", "55436", "--to", "bore.pub"], { cwd: relayDir, windowsHide: true });
      } catch (e) {
        return resolve({ success: false, error: "Error al spawn bore: " + String(e) });
      }
      if (!boreChild || !boreChild.stdout) return resolve({ success: false, error: "bore stdout no disponible" });
      boreProcess = boreChild;
      console.log(`[bore] PID: ${boreProcess.pid}`);
      const timeout = setTimeout(() => {
        if (!resolved) { resolved = true; console.error("❌ Bore tunnel timeout (10s)"); if (boreProcess) boreProcess.kill(); resolve({ success: false, error: "Timeout" }); }
      }, 10000);
      boreProcess.stdout.on("data", (data) => {
        try {
          const output = data.toString();
          console.log(`💬 [BORE LOG]: ${output.trim()}`);
          const match = output.match(/listening at (bore\.pub:\d+)/);
          if (match && !resolved) { resolved = true; clearTimeout(timeout); resolve({ success: true, url: match[1] }); }
        } catch (e) { console.error("[bore] Error en stdout handler:", e); }
      });
      boreProcess.stderr?.on("data", (data) => {
        const msg = data.toString().trim();
        stderrLog += msg + " | ";
        console.error(`🔥 [BORE STDERR]: ${msg}`);
      });
      boreProcess.on("error", (err) => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ success: false, error: err.message + " | stderr: " + stderrLog }); } });
      boreProcess.on("close", (code) => { boreProcess = null; if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ success: false, error: `Bore terminó con código ${code} | stderr: ${stderrLog}` }); } });
    });
  });

  ipcMain.handle("kill-retroarch", async () => {
    try { execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch {}
    await new Promise(r => setTimeout(r, 1000));
    console.log("🧹 Procesos RetroArch eliminados");
    return true;
  });

  ipcMain.handle("start-relay-tunnel-v2", async () => {
    return new Promise(async (resolve) => {
      const projectRoot = getProjectRoot();
      const relayDir = path.join(projectRoot, "relay-server");
      const borePath = path.join(relayDir, "bore.exe");
      if (!fs.existsSync(borePath)) return resolve({ success: false, error: "Bore no encontrado" });

      try { execSync("taskkill /f /im bore.exe 2>nul", { stdio: "ignore" }); } catch {}
      await new Promise(r => setTimeout(r, 1500));

      let boreHost = "bore.pub";
      try {
        const addrs = await dns.promises.resolve4("bore.pub");
        if (addrs && addrs.length > 0) { boreHost = addrs[0]; }
      } catch (e) {
        console.error(`⚠️ No se pudo resolver bore.pub:`, e);
      }

      console.log(`🚀 Bore V2 con IP: ${boreHost}`);
      let resolved = false;
      let boreChild;
      let stderrLog = "";
      try {
        boreChild = spawn(borePath, ["local", "55436", "--to", boreHost], { cwd: relayDir, windowsHide: true });
      } catch (e) {
        return resolve({ success: false, error: "Error al spawn bore: " + String(e) });
      }
      if (!boreChild || !boreChild.stdout) return resolve({ success: false, error: "bore stdout no disponible" });
      boreProcess = boreChild;
      const timeout = setTimeout(() => {
        if (!resolved) { resolved = true; if (boreProcess) boreProcess.kill(); resolve({ success: false, error: "Timeout" }); }
      }, 10000);
      boreProcess.stdout.on("data", (data) => {
        try {
          const output = data.toString();
          const match = output.match(/listening at ([\w.-]+:\d+)/);
          if (match && !resolved) { resolved = true; clearTimeout(timeout); resolve({ success: true, url: match[1] }); }
        } catch (e) { console.error("[bore V2] Error:", e); }
      });
      boreProcess.stderr?.on("data", (data) => {
        stderrLog += data.toString().trim() + " | ";
      });
      boreProcess.on("error", (err) => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ success: false, error: err.message + " | stderr: " + stderrLog }); } });
      boreProcess.on("close", (code) => { boreProcess = null; if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ success: false, error: `Bore terminó con código ${code} | stderr: ${stderrLog}` }); } });
    });
  });

  ipcMain.handle("start-mitm-local", async () => {
    try {
      const projectRoot = getProjectRoot();
      const relayScript = path.join(projectRoot, "relay-server", "mitm-relay.js");
      const retroArchDir = path.join(projectRoot, "retroarch");
      const retroArchPath = path.join(retroArchDir, "retroarch.exe");
      const corePath = path.join(retroArchDir, "cores", "fbneo_libretro.dll");
      const romPath = path.join(retroArchDir, "roms", "kof98.zip");
      const cfg = path.join(retroArchDir, "netplay_optimized.cfg");

      // Cleanup previous
      try { execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch {}
      if (mitmRelayProcess) { mitmRelayProcess.kill(); mitmRelayProcess = null; }
      await new Promise(r => setTimeout(r, 1000));

      if (!fs.existsSync(relayScript)) return { success: false, error: "mitm-relay.js no encontrado" };
      if (!fs.existsSync(retroArchPath)) return { success: false, error: "retroarch.exe no encontrado" };

      // 1. Launch host RA (--host)
      const hostArgs = ["-L", corePath, romPath, "--host", "--port", "55435"];
      if (fs.existsSync(cfg)) hostArgs.push("--appendconfig", cfg);
      console.log(`[RELAY] Host: ${retroArchPath} ${hostArgs.join(" ")}`);
      const host = spawn(retroArchPath, hostArgs, { cwd: retroArchDir, detached: true, stdio: ["ignore", "pipe", "pipe"] });
      host.on("error", (err) => console.error("[RELAY] Error host:", err));
      host.stdout?.on("data", (d) => console.log(`[host] ${d}`));
      host.stderr?.on("data", (d) => console.error(`[host] ${d}`));
      host.unref();

      // 2. Wait for host port
      console.log("[RELAY] Esperando puerto host 55435...");
      const hostReady = await waitForPort(55435, 8000);
      if (!hostReady) return { success: false, error: "Host RA no abrió puerto 55435" };

      // 3. Start transparent relay (55436 -> 127.0.0.1:55435)
      console.log("[RELAY] Iniciando relay forwarder...");
      mitmRelayProcess = spawn("node", [relayScript, "55436", "127.0.0.1", "55435"], {
        cwd: path.dirname(relayScript),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      mitmRelayProcess.stdout?.on("data", (d) => console.log(`[relay] ${d}`));
      mitmRelayProcess.stderr?.on("data", (d) => console.error(`[relay] ${d}`));
      mitmRelayProcess.on("error", (err) => console.error("[RELAY] Error relay:", err));
      mitmRelayProcess.on("close", (code) => { mitmRelayProcess = null; console.log(`[RELAY] Relay cerrado (${code})`); });

      // 4. Wait for relay port
      await new Promise(r => setTimeout(r, 1000));

      // 5. Launch guest RA (--connect -> relay -> host)
      const guestArgs = ["-L", corePath, romPath, "--connect", "127.0.0.1", "--port", "55436"];
      if (fs.existsSync(cfg)) guestArgs.push("--appendconfig", cfg);
      console.log(`[RELAY] Guest: ${retroArchPath} ${guestArgs.join(" ")}`);
      const guest = spawn(retroArchPath, guestArgs, { cwd: retroArchDir, detached: true, stdio: ["ignore", "pipe", "pipe"] });
      guest.on("error", (err) => console.error("[RELAY] Error guest:", err));
      guest.stdout?.on("data", (d) => console.log(`[guest] ${d}`));
      guest.stderr?.on("data", (d) => console.error(`[guest] ${d}`));
      guest.unref();

      return { success: true };
    } catch (e) {
      console.error("[RELAY] Error en handler start-mitm-local:", e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle("stop-mitm-local", async () => {
    try { execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch {}
    if (mitmRelayProcess) { mitmRelayProcess.kill(); mitmRelayProcess = null; }
    await new Promise(r => setTimeout(r, 500));
    console.log("[MITM] Detenido");
    return true;
  });

  ipcMain.handle("save-relay-url", async (_event, url: string) => {
    try {
      const projectRoot = getProjectRoot();
      fs.writeFileSync(path.join(projectRoot, "relay-server", "active_relay.txt"), url, "utf8");
      console.log("✅ Relay URL guardada en archivo:", url);
      return true;
    } catch (e) { console.error("❌ Error guardando relay URL:", e); return false; }
  });

  ipcMain.handle("get-relay-url", async () => {
    try {
      const projectRoot = getProjectRoot();
      const filePath = path.join(projectRoot, "relay-server", "active_relay.txt");
      if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf8");
      return null;
    } catch (e) { console.error("❌ Error leyendo relay URL:", e); return null; }
  });

  // ─── TAILSCALE (paralelo, no toca flujos blindados) ───
  ipcMain.handle("tailscale-host", async () => {
    try {
      const projectRoot = getProjectRoot();
      const retroArchDir = path.join(projectRoot, "retroarch");
      const retroArchPath = path.join(retroArchDir, "retroarch.exe");
      const corePath = path.join(retroArchDir, "cores", "fbneo_libretro.dll");
      const romPath = path.join(retroArchDir, "roms", "kof98.zip");
      const cfg = path.join(retroArchDir, "netplay_optimized.cfg");

      let tsIp = getTailscaleIp();
      let isLocalFallback = false;
      if (!tsIp) {
        tsIp = "127.0.0.1";
        isLocalFallback = true;
        console.log("[TAILSCALE] Tailscale no detectado, usando 127.0.0.1 para test local");
      }

      try { execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch {}
      await new Promise(r => setTimeout(r, 1000));

      const args = ["-L", corePath, romPath, "--host", "--port", "55435"];
      if (fs.existsSync(cfg)) args.push("--appendconfig", cfg);
      console.log(`[TAILSCALE] Host: ${retroArchPath} ${args.join(" ")}`);
      const host = spawn(retroArchPath, args, { cwd: retroArchDir, detached: true, stdio: "ignore" });
      host.unref();

      const ready = await waitForPort(55435, 8000);
      if (!ready) return { success: false, error: "RA no abrió puerto 55435" };

      const msg = isLocalFallback
        ? `Host RA activo en localhost. Ingresá 127.0.0.1 en JOIN VÍA TAILSCALE para test local`
        : `HOST TAILSCALE activo — IP: ${tsIp}`;
      console.log(`[TAILSCALE] Host listo, IP: ${tsIp}`);
      return { success: true, ip: tsIp, message: msg, isLocalFallback };
    } catch (e) {
      console.error("[TAILSCALE] Error host:", e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle("tailscale-guest", async (_event, { hostIp }: { hostIp: string }) => {
    try {
      if (!hostIp) return { success: false, error: "IP del host no proporcionada" };

      const projectRoot = getProjectRoot();
      const retroArchDir = path.join(projectRoot, "retroarch");
      const retroArchPath = path.join(retroArchDir, "retroarch.exe");
      const corePath = path.join(retroArchDir, "cores", "fbneo_libretro.dll");
      const romPath = path.join(retroArchDir, "roms", "kof98.zip");
      const cfg = path.join(retroArchDir, "netplay_optimized.cfg");

      const args = ["-L", corePath, romPath, "--connect", hostIp, "--port", "55435"];
      if (fs.existsSync(cfg)) args.push("--appendconfig", cfg);
      console.log(`[TAILSCALE] Guest: ${retroArchPath} ${args.join(" ")}`);
      const guest = spawn(retroArchPath, args, { cwd: retroArchDir, detached: true, stdio: "ignore" });
      guest.unref();

      return { success: true };
    } catch (e) {
      console.error("[TAILSCALE] Error guest:", e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle("stop-tailscale", async () => {
    try { execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch {}
    console.log("[TAILSCALE] Detenido");
    return true;
  });

  launchNakama();
  createWindow();
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

app.on("before-quit", () => {
  if (nakamaProcess) nakamaProcess.kill();
  if (boreProcess) { console.log("🛑 Stopping Bore..."); boreProcess.kill(); }
  if (mitmRelayProcess) { console.log("🛑 Stopping MITM relay..."); mitmRelayProcess.kill(); }
  console.log("[TAILSCALE] Limpieza en before-quit");
});
