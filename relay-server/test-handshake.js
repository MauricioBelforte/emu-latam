const net = require("net");

const PORT = 55435;
const NETPLAY_MAGIC = 0x52414E50;
const CMD_NICK = 0x0020;
const CMD_INFO = 0x0022;
const CMD_SYNC = 0x0023;
const HEADER_LEN = 16;
const POST_HEADER_LEN = 8;

function buildHeader() {
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(NETPLAY_MAGIC, 0);
  buf.writeUInt32BE(0x00040004, 4);
  buf.writeUInt32BE(1, 8);
  buf.writeUInt32BE(7, 12);
  buf.writeUInt32BE(5, 16);
  buf.writeUInt32BE(0xDEAD, 20);
  return buf;
}

function buildNick(name) {
  const buf = Buffer.alloc(8 + 32);
  buf.writeUInt32BE(CMD_NICK, 0);
  buf.writeUInt32BE(32, 4);
  buf.write(name, 8, 32, "ascii");
  return buf;
}

function buildInfo(coreName) {
  const payload = Buffer.alloc(4 + 32 + 32);
  payload.writeUInt32BE(0, 0);
  payload.write(coreName, 4, 32, "ascii");
  payload.write("v1.0", 36, 32, "ascii");
  const buf = Buffer.alloc(8 + payload.length);
  buf.writeUInt32BE(CMD_INFO, 0);
  buf.writeUInt32BE(payload.length, 4);
  payload.copy(buf, 8);
  return buf;
}

function parseCommands(data, label) {
  let off = 0;
  if (off + 16 <= data.length && data.readUInt32BE(off) === NETPLAY_MAGIC) {
    const headerEchoLen = HEADER_LEN + POST_HEADER_LEN;
    const saltVal = data.readUInt32BE(12);
    console.log(`  [${label}] Header echo: magic OK, salt=0x${saltVal.toString(16)}, header[3]${saltVal === 0 ? '=0 ✅' : '≠0 ❌'}`);
    off = headerEchoLen;
  }
  while (off + 8 <= data.length) {
    const cmd = data.readUInt32BE(off);
    const len = data.readUInt32BE(off + 4);
    const names = { 0x0020: "NICK", 0x0022: "INFO", 0x0023: "SYNC" };
    const name = names[cmd] || `0x${cmd.toString(16)}`;
    console.log(`  [${label}] CMD ${name} payload=${len}${cmd === CMD_SYNC ? ' ✅' : ''}`);
    off += 8 + len;
  }
  // Return the commands found for verdict
  const cmds = [];
  off = HEADER_LEN + POST_HEADER_LEN;
  while (off + 8 <= data.length) {
    const cmd = data.readUInt32BE(off);
    cmds.push(cmd);
    off += 8 + data.readUInt32BE(off + 4);
  }
  return cmds;
}

function connectAs(id, nickname, delayMs = 0) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const s = new net.Socket();
      const bufs = [];
      s.on("data", (d) => bufs.push(d));
      s.on("close", () => {
        const full = Buffer.concat(bufs);
        console.log(`\n[${id}] received ${full.length} bytes total:`);
        const cmds = parseCommands(full, id);
        resolve(cmds);
      });
      s.connect(PORT, "127.0.0.1", () => {
        console.log(`[${id}] Connected`);
        s.write(buildHeader());
        setTimeout(() => s.write(buildNick(nickname)), 150);
        setTimeout(() => s.write(buildInfo("FBNeo")), 400);
        setTimeout(() => s.write(buildInfo("FBNeo")), 700);
        setTimeout(() => s.end(), 2500);
      });
      s.on("error", (e) => console.log(`[${id}] Error: ${e.message}`));
    }, delayMs);
  });
}

(async () => {
  console.log("Starting handshake test...\n");
  const [masterCmds, guestCmds] = await Promise.all([
    connectAs("master", "Player1", 0),
    connectAs("guest", "Player2", 100),
  ]);

  const has = (cmds, cmd) => cmds.indexOf(cmd) !== -1;
  const masterOk = has(masterCmds, CMD_NICK);
  const guestOk = has(guestCmds, CMD_NICK);
  const masterInfo = has(masterCmds, CMD_INFO);
  const guestInfo = has(guestCmds, CMD_INFO);
  const masterSync = has(masterCmds, CMD_SYNC);
  const guestSync = has(guestCmds, CMD_SYNC);

  console.log("\n=== VERDICT ===");
  console.log(`  Master NICK: ${masterOk ? '✅' : '❌'}`);
  console.log(`  Guest NICK:  ${guestOk ? '✅' : '❌'}`);
  console.log(`  Master INFO: ${masterInfo ? '✅' : '❌'}`);
  console.log(`  Guest INFO:  ${guestInfo ? '✅' : '❌'}`);
  console.log(`  Master SYNC: ${masterSync ? '✅' : '❌'}`);
  console.log(`  Guest SYNC:  ${guestSync ? '✅' : '❌'}`);
  const allOk = masterOk && guestOk && masterInfo && guestInfo && masterSync && guestSync;
  console.log(`\n  ${allOk ? '✅ HANDSHAKE COMPLETO' : '❌ HANDSHAKE INCOMPLETO'}`);
})();
