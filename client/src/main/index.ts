import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { spawn } from "child_process";
import os from "os";
import fs from "fs";
import http from "http";
import { ChildProcess } from "child_process";

let nakamaProcess: ChildProcess | null = null;
let boreProcess: ChildProcess | null = null;

function getProjectRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "extraResources");
  }
  return path.resolve(__dirname, "../../..");
}

async function isNakamaRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:7350", (res) => {
      resolve(true);
      res.resume();
    });
    req.on("error", () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function launchNakama(): void {
  const projectRoot = getProjectRoot();
  const nakamaDir = path.join(projectRoot, "backend");
  const nakamaPath = path.join(nakamaDir, "nakama.exe");

  if (!fs.existsSync(nakamaPath)) {
    console.error("❌ Nakama server not found at:", nakamaPath);
    return;
  }

  isNakamaRunning().then((running) => {
    if (running) {
      console.log("✅ Nakama is already running.");
      return;
    }

    console.log("🚀 Launching Nakama (Hidden Mode)...");
    nakamaProcess = spawn(nakamaPath, ["--config", "local.yml"], {
      cwd: nakamaDir,
      windowsHide: true,
      stdio: "ignore",
    });

    nakamaProcess.on("error", (err) => {
      console.error("❌ Failed to start Nakama:", err);
    });

    if (nakamaProcess.pid) {
      console.log(`✅ Nakama started (PID: ${nakamaProcess.pid})`);
    }
  });
}

function createWindow(): void {
  if (!app.requestSingleInstanceLock()) {
    const randomSuffix = Math.floor(Math.random() * 1000);
    app.setPath(
      "userData",
      path.join(app.getPath("userData"), `dev-instance-${randomSuffix}`),
    );
  }

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    // mainWindow.webContents.openDevTools();
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("launch-game", async (_event, args) => {
    const { isHost, peerIp, useRelay, relayIp } = args;

    const projectRoot = getProjectRoot();
    const retroArchDir = path.join(projectRoot, "retroarch");
    const retroArchPath = path.join(retroArchDir, "retroarch.exe");
    const corePath = path.join(retroArchDir, "cores", "fbneo_libretro.dll");
    const romPath = path.join(retroArchDir, "roms", "kof98.zip");

    console.log("-----------------------------------------");
    console.log("🎮 SISTEMA DE LANZAMIENTO V2 - RELAY");
    console.log("🚀 EXE:", retroArchPath);

    if (!fs.existsSync(retroArchPath)) {
      console.error("❌ NO EXISTE EL EXE");
      return { success: false, error: "EXE no existe" };
    }

    // ARGUMENTOS DE NETPLAY (TCP NATIVO)
    // El modo host SIEMPRE debe abrir el puerto 55435
    const spawnArgs = ["-L", corePath, romPath];

    if (useRelay) {
      console.log("🚀 MODO TUNEL ACTIVADO (bypassing puertos cerrados)");
      
      if (isHost) {
        console.log("🎮 Iniciando como HOST en el puerto TCP 55435...");
        spawnArgs.push("--host", "--port", "55435");
      } else {
        console.log(`🎮 Conectando como CLIENTE a: ${relayIp}`);
        
        // CORRECCIÓN CRÍTICA: RetroArch se rompe si usas "--connect host:port". 
        // Hay que enviarlos por separado: "--connect host --port port".
        let connectHost = relayIp;
        let connectPort = "55435"; // defecto
        
        if (relayIp.includes(":")) {
          const parts = relayIp.split(":");
          connectHost = parts[0];
          connectPort = parts[1];
        }
        
        spawnArgs.push("--connect", connectHost);
        spawnArgs.push("--port", connectPort);
      }
    } else {
      // Modo LAN estándar (sin túnel)
      if (isHost) {
        spawnArgs.push("--host", "--port", "55435");
      } else {
        spawnArgs.push("--connect", peerIp || "127.0.0.1", "--port", "55435");
      }
    }

    try {
      // Usamos spawn sin shell para ver la salida cruda
      const child = spawn(retroArchPath, spawnArgs, {
        cwd: retroArchDir,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"], // Capturamos salida y error
      });

      // Escuchamos ERRORES del emulador
      child.stderr?.on("data", (data) => {
        console.error(`🔥 [RETROARCH ERROR]: ${data}`);
      });

      child.stdout?.on("data", (data) => {
        console.log(`💬 [RETROARCH LOG]: ${data}`);
      });

      child.on("error", (err) => {
        console.error("❌ FALLO DE SPAWN:", err);
      });

      child.unref();

      if (child.pid) {
        console.log(`✅ PROCESO LANZADO (PID: ${child.pid})`);

        let myIp = "127.0.0.1";
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
          for (const net of nets[name]!) {
            if (net.family === "IPv4" && !net.internal) {
              myIp = net.address;
              break;
            }
          }
        }
        return { success: true, myIp };
      }

      return { success: false, error: "No se obtuvo PID" };
    } catch (e) {
      console.error("❌ EXCEPCION:", e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle("start-relay-tunnel", async () => {
    return new Promise((resolve) => {
      const projectRoot = getProjectRoot();
      const relayDir = path.join(projectRoot, "relay-server");
      const borePath = path.join(relayDir, "bore.exe");

      if (!fs.existsSync(borePath)) {
        console.error("❌ Bore binary not found at:", borePath);
        return resolve({ success: false, error: "Bore no encontrado" });
      }

      if (boreProcess) {
        boreProcess.kill();
        boreProcess = null;
      }

      console.log("🚀 Launching Bore Tunnel...");
      boreProcess = spawn(borePath, ["local", "55435", "--to", "bore.pub"], {
        cwd: relayDir,
        windowsHide: true,
      });

      let tunnelAddress = "";
      const timeout = setTimeout(() => {
        if (!tunnelAddress) {
          console.error("❌ Bore tunnel timeout");
          resolve({ success: false, error: "Timeout al iniciar túnel" });
        }
      }, 10000);

      boreProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        console.log(`💬 [BORE LOG]: ${output}`);
        
        // Match "listening at bore.pub:XXXXX"
        const match = output.match(/listening at (bore\.pub:\d+)/);
        if (match && !tunnelAddress) {
          tunnelAddress = match[1];
          clearTimeout(timeout);
          console.log(`✅ Bore tunnel ready: ${tunnelAddress}`);
          resolve({ success: true, url: tunnelAddress });
        }
      });

      boreProcess.stderr?.on("data", (data) => {
        console.error(`🔥 [BORE ERROR]: ${data}`);
      });

      boreProcess.on("close", (code) => {
        console.log(`🛑 Bore process exited with code ${code}`);
        boreProcess = null;
      });
    });
  });

  launchNakama();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nakamaProcess) {
    console.log("🛑 Stopping Nakama...");
    nakamaProcess.kill();
  }
  if (boreProcess) {
    console.log("🛑 Stopping Bore...");
    boreProcess.kill();
  }
});
