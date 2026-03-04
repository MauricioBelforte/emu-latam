import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { spawn } from "child_process";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#050505",
    title: "KOF LATAM LAUNCHER",
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("launch-game", async (_event, args) => {
  const emulatorPath = path.join(process.cwd(), "..", "emulator", "fbneo.exe");
  const romName = args?.rom || "kof98";
  console.log(`Lanzando: ${emulatorPath}`);
  spawn(emulatorPath, [romName], { cwd: path.dirname(emulatorPath) });
});
