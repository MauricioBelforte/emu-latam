"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: "#050505",
    title: "KOF LATAM LAUNCHER"
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}
electron.app.whenReady().then(createWindow);
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.ipcMain.handle("launch-game", async (_event, args) => {
  const emulatorPath = path.join(process.cwd(), "..", "emulator", "fbneo.exe");
  const romName = args?.rom || "kof98";
  console.log(`Lanzando: ${emulatorPath}`);
  child_process.spawn(emulatorPath, [romName], { cwd: path.dirname(emulatorPath) });
});
