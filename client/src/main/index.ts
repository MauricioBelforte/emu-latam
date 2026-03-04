import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { spawn } from "child_process";
import os from "os";
import fs from "fs";

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
    mainWindow.webContents.openDevTools();
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("launch-game", async (_event, args) => {
    const { isHost, peerIp } = args;

    const projectRoot = path.resolve(process.cwd(), "..");
    const retroArchDir = path.join(projectRoot, "retroarch");
    const retroArchPath = path.join(retroArchDir, "retroarch.exe");
    const corePath = path.join(retroArchDir, "cores", "fbneo_libretro.dll");
    const romPath = path.join(retroArchDir, "roms", "kof98.zip");

    console.log("-----------------------------------------");
    console.log("🎮 INTENTANDO SPAWN DIRECTO");
    console.log("🚀 EXE:", retroArchPath);

    if (!fs.existsSync(retroArchPath)) {
      console.error("❌ NO EXISTE EL EXE");
      return { success: false, error: "EXE no existe" };
    }

    // Argumentos limpios (Node los escapa automáticamente)
    const spawnArgs = ["-L", corePath, romPath, "--port", "55435"];

    if (isHost) {
      spawnArgs.push("--host");
    } else {
      spawnArgs.push("--connect", peerIp || "127.0.0.1");
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

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
