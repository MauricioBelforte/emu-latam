// Test del flujo completo: bore tunnel + RetroArch host + RetroArch client
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const RA_DIR = path.join(ROOT, "retroarch");
const RA = path.join(RA_DIR, "retroarch.exe");
const CORE = path.join(RA_DIR, "cores", "fbneo_libretro.dll");
const ROM = path.join(RA_DIR, "roms", "kof98.zip");
const CFG = path.join(RA_DIR, "netplay_optimized.cfg");
const BORE = path.join(ROOT, "relay-server", "bore.exe");

function waitForPort(port, host, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const net = require("net");
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const socket = new net.Socket();
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() < deadline) setTimeout(check, 200);
        else resolve(false);
      });
      socket.connect(port, host);
    };
    check();
  });
}

async function main() {
  console.log("=== FLOW TEST ===");
  console.log("RA:", RA);
  console.log("BORE:", BORE);
  console.log("CORE:", CORE);
  console.log("ROM:", ROM);
  console.log("CFG:", CFG);

  // 1. Start bore
  console.log("\n1. Starting bore tunnel...");
  const boreProc = spawn(BORE, ["local", "55435", "--to", "bore.pub"], {
    cwd: path.join(ROOT, "relay-server"),
    windowsHide: true,
  });

  let captured = null;
  const boreUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("bore timeout")), 10000);
    boreProc.stdout.on("data", (data) => {
      const output = data.toString();
      console.log("[bore]", output.trim());
      const match = output.match(/listening at (bore\.pub:\d+)/);
      if (match) {
        clearTimeout(timeout);
        captured = match[1];
        resolve(captured);
      }
    });
    boreProc.stderr.on("data", (d) => console.log("[bore]", d.toString().trim()));
    boreProc.on("error", reject);
    boreProc.on("close", (c) => { if (!captured) reject(new Error("bore closed " + c)); });
  });
  console.log("✅ bore URL:", boreUrl);

  // 2. Launch RA HOST
  console.log("\n2. Launching RA HOST...");
  const hostArgs = ["-L", CORE, ROM, "--appendconfig", CFG, "--host", "--port", "55435"];
  console.log("HOST args:", hostArgs);
  const hostProc = spawn(RA, hostArgs, {
    cwd: RA_DIR,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  hostProc.unref();
  hostProc.stdout.on("data", (d) => console.log("[HOST]", d.toString().trim()));
  hostProc.stderr.on("data", (d) => console.log("[HOST-ERR]", d.toString().trim()));
  hostProc.on("close", (c) => console.log(`[HOST] exited ${c}`));

  // Wait for port 55435
  console.log("⏳ Waiting for port 55435...");
  const portReady = await waitForPort(55435, "127.0.0.1", 8000);
  console.log("Port 55435 ready:", portReady);

  // 3. Parse bore URL and launch RA CLIENT
  const connectHost = "bore.pub";
  const connectPort = boreUrl.split(":")[1];
  console.log("\n3. Launching RA CLIENT ->", connectHost, connectPort);
  const clientArgs = ["-L", CORE, ROM, "--appendconfig", CFG, "--connect", connectHost, "--port", connectPort];
  console.log("CLIENT args:", clientArgs);
  const clientProc = spawn(RA, clientArgs, {
    cwd: RA_DIR,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  clientProc.unref();
  clientProc.stdout.on("data", (d) => console.log("[CLIENT]", d.toString().trim()));
  clientProc.stderr.on("data", (d) => console.log("[CLIENT-ERR]", d.toString().trim()));
  clientProc.on("close", (c) => console.log(`[CLIENT] exited ${c}`));

  console.log("\nBoth RetroArch processes should be running!");
  console.log("Press Ctrl+C to exit.");
  setTimeout(() => {
    console.log("\nRetroArch processes:");
    const { execSync } = require("child_process");
    try { execSync("tasklist /fi \"imagename eq retroarch.exe\"", { stdio: "inherit" }); } catch {}
  }, 3000);
}

main().catch(console.error);
