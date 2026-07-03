const net = require("net");

const RELAY_PORT = parseInt(process.argv[2], 10) || 55435;
const TARGET_HOST = process.argv[3] || "127.0.0.1";
const TARGET_PORT = parseInt(process.argv[4], 10) || 55436;

console.log(`[relay] Transparent forwarder: :${RELAY_PORT} -> ${TARGET_HOST}:${TARGET_PORT}`);

const server = net.createServer((incoming) => {
  console.log(`[relay] Incoming connection from ${incoming.remoteAddress || "unknown"}:${incoming.remotePort}`);
  const target = new net.Socket();
  target.setNoDelay(true);
  incoming.setNoDelay(true);

  target.connect(TARGET_PORT, TARGET_HOST, () => {
    console.log(`[relay] Connected to target ${TARGET_HOST}:${TARGET_PORT}, piping...`);
    incoming.pipe(target);
    target.pipe(incoming);
  });

  target.on("error", (err) => {
    if (!err.message.includes("ECONNRESET") && !err.message.includes("EPIPE")) {
      console.error(`[relay] Target error: ${err.message}`);
    }
    incoming.destroy();
  });

  incoming.on("error", (err) => {
    if (!err.message.includes("ECONNRESET") && !err.message.includes("EPIPE")) {
      console.error(`[relay] Incoming error: ${err.message}`);
    }
    target.destroy();
  });

  incoming.on("close", () => {
    target.destroy();
  });
  target.on("close", () => {
    incoming.destroy();
  });
});

server.listen(RELAY_PORT, "0.0.0.0", () => {
  console.log(`[relay] Listening on 0.0.0.0:${RELAY_PORT}`);
});

server.on("error", (err) => {
  console.error(`[relay] Server error: ${err.message}`);
});

process.on("SIGINT", () => { server.close(); process.exit(0); });
process.on("SIGTERM", () => { server.close(); process.exit(0); });
