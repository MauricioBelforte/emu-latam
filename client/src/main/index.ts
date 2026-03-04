import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { spawn } from "child_process";

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  async function createWindow() {
    const win = new BrowserWindow({
      width: 1400,
      height: 900,
      backgroundColor: "#050505",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Temporary for debugging local resource issues
      },
      autoHideMenuBar: false,
      title: "KOF LATAM - VERSIÓN 2.0 (DEBUG)",
    });

    win.webContents.openDevTools();

    // FORCE LOAD: If env var is missing, try default Vite port
    const devUrl =
      process.env.ELECTRON_RENDERER_URL ||
      process.env.VITE_DEV_SERVER_URL ||
      "http://localhost:5173";

    if (!app.isPackaged) {
      console.log("Loading from Dev Server:", devUrl);
      win.loadURL(devUrl).catch(() => {
        console.log("Retry loading Dev Server...");
        setTimeout(() => win.loadURL(devUrl), 2000);
      });
    } else {
      win.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
  }

  app.whenReady().then(createWindow);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

ipcMain.handle("launch-game", async (_event, args) => {
  const emulatorPath = path.join(
    process.cwd(),
    "..",
    "emulator",
    "fbneo64.exe",
  );
  const romName = args?.rom || "kof98";
  console.log(`Lanzando: ${emulatorPath} ${romName}`);
  // Añadimos el flag -w para forzar modo ventana y evitar errores de resolución
  spawn(emulatorPath, [romName, "-w"], { cwd: path.dirname(emulatorPath) });
});
