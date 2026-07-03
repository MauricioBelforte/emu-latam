// Starts bore, captures URL, writes to file, keeps running
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const BORE = path.resolve(__dirname, "../relay-server/bore.exe");
const BORE_DIR = path.resolve(__dirname, "../relay-server");
const URL_FILE = path.resolve(__dirname, "../relay-server/active_relay.txt");

const boreProc = spawn(BORE, ["local", "55435", "--to", "bore.pub"], {
    cwd: BORE_DIR, windowsHide: true,
});
boreProc.stdout.on("data", (d) => {
    const out = d.toString();
    const m = out.match(/listening at (bore\.pub:\d+)/);
    if (m) {
        fs.writeFileSync(URL_FILE, m[1], "utf8");
        console.log("BORE_URL:" + m[1]);
    }
});
boreProc.stderr.on("data", (d) => process.stdout.write(d.toString()));

// Keep running until killed
process.on("SIGINT", () => { boreProc.kill(); process.exit(0); });
setInterval(() => {}, 60000); // keep alive
