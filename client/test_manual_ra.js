const { spawn, execSync } = require("child_process");
const path = require("path");
const net = require("net");

const RA = path.resolve(__dirname, "../retroarch/retroarch.exe");
const RA_DIR = path.resolve(__dirname, "../retroarch");
const CORE = path.resolve(__dirname, "../retroarch/cores/fbneo_libretro.dll");
const ROM = path.resolve(__dirname, "../retroarch/roms/kof98.zip");
const CFG = path.resolve(__dirname, "../retroarch/netplay_optimized.cfg");
const BORE = path.resolve(__dirname, "../relay-server/bore.exe");
const BORE_DIR = path.resolve(__dirname, "../relay-server");

// Kill old processes
try { execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch {}
try { execSync("taskkill /f /im bore.exe 2>nul", { stdio: "ignore" }); } catch {}

// 1. Start bore (capture URL non-blocking)
console.log("[BORE] Starting...");
const boreProc = spawn(BORE, ["local", "55435", "--to", "bore.pub"], {
    cwd: BORE_DIR, windowsHide: false,
});
let boreUrl = null;
boreProc.stdout.on("data", (d) => {
    const out = d.toString();
    process.stdout.write("[BORE] " + out);
    const m = out.match(/listening at (bore\.pub:\d+)/);
    if (m) boreUrl = m[1];
});
boreProc.stderr.on("data", (d) => process.stdout.write("[BORE-ERR] " + d.toString()));
boreProc.on("error", (e) => console.log("[BORE-ERR]", e.message));

// 2. Wait for bore, then launch RA HOST
const waitBore = setInterval(() => {
    if (!boreUrl) return;
    clearInterval(waitBore);
    console.log("\n[HOST] Launching RA HOST...");
    
    // Get current PID count
    let before = execSync("tasklist /FI \"IMAGENAME eq retroarch.exe\" /NH 2>nul", { encoding: "utf8" }).trim();
    console.log("[HOST] RA processes before:", before.split("\n").length - 1);
    
    const hostProc = spawn(RA, [
        "-L", CORE, ROM,
        "--appendconfig", CFG,
        "--host", "--port", "55435"
    ], { cwd: RA_DIR, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    hostProc.unref();
    hostProc.stdout.on("data", d => process.stdout.write("[HOST] " + d.toString()));
    hostProc.stderr.on("data", d => process.stdout.write("[HOST-ERR] " + d.toString()));
    hostProc.on("exit", (code) => console.log("[HOST] Exited with code", code));
    
    // 3. Wait for port, then launch Guest via bore
    setTimeout(() => {
        // Check if port is ready
        const sock = new net.Socket();
        sock.setTimeout(3000);
        sock.on("connect", () => {
            sock.destroy();
            console.log("[HOST] Port 55435 ready!");
            
            const bport = boreUrl.split(":")[1];
            console.log(`[GUEST] Connecting to ${boreUrl}...`);
            
            // Open RA CLIENT VIA BORE in visible mode
            const guestProc = spawn(RA, [
                "-L", CORE, ROM,
                "--appendconfig", CFG,
                "--connect", "bore.pub",
                "--port", bport
            ], { cwd: RA_DIR, detached: true, stdio: ["ignore", "pipe", "pipe"] });
            guestProc.unref();
            guestProc.stdout.on("data", d => process.stdout.write("[GUEST] " + d.toString()));
            guestProc.stderr.on("data", d => process.stdout.write("[GUEST-ERR] " + d.toString()));
            guestProc.on("exit", (code) => console.log("[GUEST] Exited with code", code));
            
            // Check connections after delay
            setTimeout(() => {
                console.log("\n=== NETSTAT ===");
                try {
                    const out = execSync("netstat -ano | findstr 55435", { encoding: "utf8", timeout: 5000 });
                    console.log(out);
                } catch {}
                try {
                    const out = execSync("netstat -ano | findstr 159.223.110.159", { encoding: "utf8", timeout: 5000 });
                    console.log("[BORE-CONN]\n" + out);
                } catch { console.log("[BORE-CONN] None"); }
                try {
                    const ps = execSync("tasklist /FI \"IMAGENAME eq retroarch.exe\" /FO CSV /NH", { encoding: "utf8", timeout: 5000 });
                    console.log("[RA-PROCS]\n" + ps);
                } catch {}
                
                console.log("\n[DONE] Keeping RAs running. Press Ctrl+C to cleanup.");
            }, 10000);
        });
        sock.on("error", () => {
            sock.destroy();
            console.log("[HOST] Port 55435 not ready after 3s, checking...");
            setTimeout(() => {
                const sock2 = new net.Socket();
                sock2.setTimeout(5000);
                sock2.on("connect", () => { sock2.destroy(); console.log("[HOST] Port ready!"); });
                sock2.on("error", () => { sock2.destroy(); console.log("[FAIL] Port never ready"); });
                sock2.connect(55435, "127.0.0.1");
            }, 5000);
        });
        sock.on("timeout", () => {
            sock.destroy();
            console.log("[HOST] Port check timeout");
        });
        sock.connect(55435, "127.0.0.1");
    }, 4000);
}, 500);

// Cleanup on exit
process.on("SIGINT", () => {
    console.log("\n[CLEANUP] Killing...");
    try { execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch {}
    try { execSync("taskkill /f /im bore.exe 2>nul", { stdio: "ignore" }); } catch {}
    process.exit(0);
});
