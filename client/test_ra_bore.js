const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const RA = path.resolve(__dirname, "../retroarch/retroarch.exe");
const RA_DIR = path.resolve(__dirname, "../retroarch");
const CORE = path.resolve(__dirname, "../retroarch/cores/fbneo_libretro.dll");
const ROM = path.resolve(__dirname, "../retroarch/roms/kof98.zip");
const CFG = path.resolve(__dirname, "../retroarch/netplay_optimized.cfg");
const BORE = path.resolve(__dirname, "../relay-server/bore.exe");
const BORE_DIR = path.resolve(__dirname, "../relay-server");

// 1. Start bore
console.log("[BORE] Starting...");
const boreProc = spawn(BORE, ["local", "55435", "--to", "bore.pub"], {
    cwd: BORE_DIR, windowsHide: true,
});
let boreUrl = null;
boreProc.stdout.on("data", (d) => {
    const output = d.toString();
    process.stdout.write("[BORE] " + output);
    const m = output.match(/listening at (bore\.pub:\d+)/);
    if (m) { boreUrl = m[1]; console.log("[BORE_URL]", boreUrl); }
});
boreProc.stderr.on("data", (d) => process.stdout.write("[BORE-ERR] " + d.toString()));
boreProc.on("error", (e) => console.log("[BORE-ERR]", e.message));

// 2. Wait for bore, then launch RA HOST
setTimeout(() => {
    if (!boreUrl) { console.log("[FAIL] Bore not ready"); cleanup(); return; }
    console.log("[HOST] Launching RA HOST...");
    const hostProc = spawn(RA, [
        "-L", CORE, ROM,
        "--appendconfig", CFG,
        "--host", "--port", "55435"
    ], { cwd: RA_DIR, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    hostProc.unref();
    hostProc.stdout.on("data", d => process.stdout.write("[HOST] " + d.toString()));
    hostProc.stderr.on("data", d => process.stdout.write("[HOST-ERR] " + d.toString()));
    hostProc.on("exit", (code) => console.log("[HOST] Exited with code", code));

    // 3. Wait for port, then launch RA CLIENT via bore
    setTimeout(() => {
        waitForPort(55435, 10000, (ready) => {
            if (!ready) { console.log("[FAIL] Port 55435 not ready"); cleanup(); return; }
            console.log("[HOST] Port 55435 ready!");

            const bport = boreUrl.split(":")[1];
            console.log(`[CLIENT] Launching RA CLIENT -> ${boreUrl}...`);
            const clientProc = spawn(RA, [
                "-L", CORE, ROM,
                "--appendconfig", CFG,
                "--connect", "bore.pub",
                "--port", bport
            ], { cwd: RA_DIR, detached: true, stdio: ["ignore", "pipe", "pipe"] });
            clientProc.unref();
            clientProc.stdout.on("data", d => process.stdout.write("[CLIENT] " + d.toString()));
            clientProc.stderr.on("data", d => process.stdout.write("[CLIENT-ERR] " + d.toString()));
            clientProc.on("exit", (code) => console.log("[CLIENT] Exited with code", code));

            // 4. Check connections after 8s
            setTimeout(() => {
                checkConnections();
            }, 8000);
        });
    }, 2000);
}, 7000);

function waitForPort(port, timeout, cb) {
    const start = Date.now();
    const check = () => {
        const sock = new net.Socket();
        sock.setTimeout(2000);
        sock.on("connect", () => { sock.destroy(); cb(true); });
        sock.on("error", () => { sock.destroy(); if (Date.now() - start > timeout) cb(false); else setTimeout(check, 500); });
        sock.on("timeout", () => { sock.destroy(); if (Date.now() - start > timeout) cb(false); else setTimeout(check, 500); });
        sock.connect(port, "127.0.0.1");
    };
    check();
}

function checkConnections() {
    const { execSync } = require("child_process");
    try {
        const out = execSync("netstat -ano | findstr 55435", { encoding: "utf8", timeout: 5000 });
        console.log("[NETSTAT]\n" + out);
    } catch (e) {
        console.log("[NETSTAT] Error:", e.message);
    }
    try {
        const out = execSync("netstat -ano | findstr 159.223.110.159", { encoding: "utf8", timeout: 5000 });
        console.log("[NETSTAT-bore]\n" + out);
    } catch (e) {
        console.log("[NETSTAT-bore] No connections to bore.pub");
    }
    // Check RA processes
    try {
        const out = execSync("tasklist /FI \"IMAGENAME eq retroarch.exe\" /FO CSV /NH", { encoding: "utf8", timeout: 5000 });
        console.log("[RA-PROCS]\n" + out);
    } catch (e) { console.log("[RA-PROCS] None"); }
}

function cleanup() {
    console.log("[CLEANUP] Killing processes...");
    try { require("child_process").execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch (e) {}
    try { require("child_process").execSync("taskkill /f /im bore.exe 2>nul", { stdio: "ignore" }); } catch (e) {}
    process.exit(0);
}

setTimeout(cleanup, 40000);
process.on("SIGINT", cleanup);
