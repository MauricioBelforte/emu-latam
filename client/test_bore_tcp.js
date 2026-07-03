// Test bore TCP forwarding with echo server
const net = require("net");
const { spawn } = require("child_process");
const path = require("path");

const BORE = path.resolve(__dirname, "../relay-server/bore.exe");
const BORE_DIR = path.resolve(__dirname, "../relay-server");

// 1. Start echo server on 55435
const echoServer = net.createServer((c) => {
    console.log("[ECHO] Client connected:", c.remoteAddress);
    c.on("data", (data) => {
        console.log("[ECHO] Received:", data.toString().trim());
        c.write("ECHO:" + data.toString());
    });
    c.on("close", () => console.log("[ECHO] Client disconnected"));
});
echoServer.listen(55435, "127.0.0.1", () => console.log("[ECHO] Listening on 55435"));

// 2. Start bore
console.log("[BORE] Starting...");
const boreProc = spawn(BORE, ["local", "55435", "--to", "bore.pub"], {
    cwd: BORE_DIR,
    windowsHide: true,
});
let boreUrl = null;
boreProc.stdout.on("data", (d) => {
    const output = d.toString();
    console.log("[BORE]", output.trim());
    const m = output.match(/listening at (bore\.pub:\d+)/);
    if (m) boreUrl = m[1];
});
boreProc.stderr.on("data", (d) => console.log("[BORE-ERR]", d.toString().trim()));
boreProc.on("error", (e) => console.log("[BORE-ERR]", e));

// 3. After bore is ready, test the tunnel
setTimeout(() => {
    if (!boreUrl) {
        console.log("[TEST] Bore not ready yet, waiting...");
        return;
    }
    const port = boreUrl.split(":")[1];
    console.log(`[TEST] Connecting to bore.pub:${port}...`);
    const client = net.createConnection({ host: "bore.pub", port: parseInt(port) }, () => {
        console.log("[TEST] Connected to bore.pub!");
        client.write("HELLO FROM TEST\n");
    });
    client.on("data", (data) => {
        console.log("[TEST] Received:", data.toString().trim());
        client.end();
    });
    client.on("end", () => console.log("[TEST] Disconnected"));
    client.on("error", (e) => console.log("[TEST] Error:", e.message));
}, 6000);

// 4. Cleanup after 15 seconds
setTimeout(() => {
    console.log("[CLEANUP] Done. Killing processes...");
    boreProc.kill();
    echoServer.close();
    process.exit(0);
}, 15000);
