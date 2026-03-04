"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  async function createWindow() {
    const win = new electron.BrowserWindow({
      width: 1400,
      height: 900,
      backgroundColor: "#050505",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false
        // Temporary for debugging local resource issues
      },
      autoHideMenuBar: false,
      title: "KOF LATAM - VERSIÓN 2.0 (DEBUG)"
    });
    win.webContents.openDevTools();
    const devUrl = process.env.ELECTRON_RENDERER_URL || process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    if (!electron.app.isPackaged) {
      console.log("Loading from Dev Server:", devUrl);
      win.loadURL(devUrl).catch(() => {
        console.log("Retry loading Dev Server...");
        setTimeout(() => win.loadURL(devUrl), 2e3);
      });
    } else {
      win.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
  }
  electron.app.whenReady().then(createWindow);
  electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") electron.app.quit();
  });
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
electron.ipcMain.handle("launch-game", async (_event, args) => {
  const emulatorPath = path.join(process.cwd(), "..", "emulator", "fbneo.exe");
  const romName = args?.rom || "kof98";
  console.log(`Lanzando: ${emulatorPath}`);
  child_process.spawn(emulatorPath, [romName], { cwd: path.dirname(emulatorPath) });
});
