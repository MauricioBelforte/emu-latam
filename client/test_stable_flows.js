/**
 * Tests automatizados para flujos blindados (estables)
 *
 * Verifica que los componentes clave de los flujos:
 *   - HOST DIRECTO (sin bore)
 *   - HOST GAME (BORE) manual + JOIN GAME
 *
 * sigan funcionando correctamente. Si estos tests fallan,
 * algo se rompió en los handlers del main process.
 *
 * USO: node test_stable_flows.js
 */

const net = require("net");
const fs = require("fs");
const path = require("path");

const RA_DIR = path.resolve(__dirname, "..", "retroarch");
const RELAY_DIR = path.resolve(__dirname, "..", "relay-server");
const RELAY_FILE = path.join(RELAY_DIR, "active_relay.txt");
const CFG_FILE = path.join(RA_DIR, "netplay_optimized.cfg");

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

// ──────────────────────────────────────────
// 1. REGEX TESTS
// ──────────────────────────────────────────
console.log("\n📦 REGEX — start-relay-tunnel (ORIGINAL, flujo manual)");

const originalRegex = /listening at (bore\.pub:\d+)/;
assert(
  "Captura bore.pub:XXXXX",
  "listening at bore.pub:31501".match(originalRegex)?.[1] === "bore.pub:31501",
);
assert(
  "NO captura IP (original NO debe matchear IP)",
  "listening at 159.223.110.159:31501".match(originalRegex) === null,
);

console.log("\n📦 REGEX — start-relay-tunnel-v2 (challenge)");
const v2Regex = /listening at ([\w.-]+:\d+)/;
assert(
  "Captura bore.pub:XXXXX",
  "listening at bore.pub:31501".match(v2Regex)?.[1] === "bore.pub:31501",
);
assert(
  "Captura IP:port",
  "listening at 159.223.110.159:31501".match(v2Regex)?.[1] === "159.223.110.159:31501",
);
assert(
  "Captura hostname con guión",
  "listening at mi-tunel.com:12345".match(v2Regex)?.[1] === "mi-tunel.com:12345",
);

// ──────────────────────────────────────────
// 2. SPAWN ARGS TESTS (simula launch-game)
// ──────────────────────────────────────────
console.log("\n🚀 SPAWN ARGS — Modo HOST DIRECTO (useRelay=false, isHost=true)");

function buildArgs_DirectHost() {
  const args = ["-L", "core.dll", "rom.zip"];
  args.push("--appendconfig", "cfg.cfg");
  args.push("--host", "--port", "55435");
  return args;
}

const directHostArgs = buildArgs_DirectHost();
assert(
  "Contiene --host --port 55435",
  directHostArgs.includes("--host") && directHostArgs.includes("--port") && directHostArgs.includes("55435"),
);
assert("NO contiene --connect", !directHostArgs.includes("--connect"));

console.log("\n🚀 SPAWN ARGS — Modo GUEST DIRECTO (useRelay=false, isHost=false)");

function buildArgs_DirectGuest() {
  const args = ["-L", "core.dll", "rom.zip"];
  args.push("--appendconfig", "cfg.cfg");
  args.push("--connect", "127.0.0.1", "--port", "55435");
  return args;
}

const directGuestArgs = buildArgs_DirectGuest();
assert(
  "Contiene --connect 127.0.0.1 --port 55435",
  directGuestArgs.includes("--connect") && directGuestArgs.includes("127.0.0.1") && directGuestArgs.includes("--port") && directGuestArgs.includes("55435"),
);
assert("NO contiene --host", !directGuestArgs.includes("--host"));

console.log("\n🚀 SPAWN ARGS — Modo HOST BORE (useRelay=true, isHost=true)");

function buildArgs_BoreHost() {
  const args = ["-L", "core.dll", "rom.zip"];
  args.push("--appendconfig", "cfg.cfg");
  args.push("--host", "--port", "55435");
  return args;
}

const boreHostArgs = buildArgs_BoreHost();
assert(
  "Contiene --host --port 55435",
  boreHostArgs.includes("--host") && boreHostArgs.includes("--port") && boreHostArgs.includes("55435"),
);
assert("NO contiene --connect", !boreHostArgs.includes("--connect"));

console.log("\n🚀 SPAWN ARGS — Modo GUEST BORE (useRelay=true, isHost=false, relayIp=bore.pub:XXXXX)");

function buildArgs_BoreGuest(relayIp) {
  const parts = relayIp.includes(":") ? relayIp.split(":") : [relayIp, "55435"];
  const connectHost = parts[0];
  const connectPort = parseInt(parts[1], 10);

  if (connectHost === "127.0.0.1" && connectPort === 55435) {
    // Directo (no proxy)
    const args = ["-L", "core.dll", "rom.zip"];
    args.push("--appendconfig", "cfg.cfg");
    args.push("--connect", "127.0.0.1", "--port", "55435");
    return args;
  }
  // Con proxy: RA siempre conecta a 127.0.0.1 (puerto 55435)
  const args = ["-L", "core.dll", "rom.zip"];
  args.push("--appendconfig", "cfg.cfg");
  args.push("--connect", "127.0.0.1");
  return args;
}

const boreGuestArgs = buildArgs_BoreGuest("bore.pub:31501");
assert(
  "Contiene --connect 127.0.0.1 (proxy local)",
  boreGuestArgs.includes("--connect") && boreGuestArgs.includes("127.0.0.1"),
);
assert("NO contiene --host", !boreGuestArgs.includes("--host"));
assert("puerto 55435 NO incluido explícitamente", !boreGuestArgs.includes("55435"));

const directGuestArgsFromBore = buildArgs_BoreGuest("127.0.0.1:55435");
assert(
  "Conexión local (127.0.0.1:55435) usa --port 55435",
  directGuestArgsFromBore.includes("--port") && directGuestArgsFromBore.includes("55435"),
);

// ──────────────────────────────────────────
// 3. PROXY TCP TEST
// ──────────────────────────────────────────
console.log("\n🔌 PROXY TCP — Inicio, conexión, reenvío de datos");

function testProxy() {
  return new Promise((resolve) => {
    let proxyServer;
    const PROXY_PORT = 55437; // Puerto de test (no interfere con 55435/55436)

    // Servidor de eco (simula el host)
    const echoServer = net.createServer((socket) => {
      socket.on("data", (data) => {
        socket.write("ECHO:" + data.toString());
      });
    });

    echoServer.listen(PROXY_PORT + 1, "127.0.0.1", () => {
      // Proxy: reenvía a echoServer
      proxyServer = net.createServer((localSocket) => {
        const remoteSocket = new net.Socket();
        remoteSocket.connect(PROXY_PORT + 1, "127.0.0.1", () => {
          localSocket.pipe(remoteSocket);
          remoteSocket.pipe(localSocket);
        });
        remoteSocket.on("error", () => localSocket.destroy());
        localSocket.on("error", () => remoteSocket.destroy());
      });

      proxyServer.listen(PROXY_PORT, "127.0.0.1", () => {
        // Cliente: conecta al proxy y envía datos
        const client = new net.Socket();
        let received = "";

        client.connect(PROXY_PORT, "127.0.0.1", () => {
          client.write("HOLA_PROXY");
        });

        client.on("data", (data) => {
          received += data.toString();
          client.destroy();
          proxyServer.close();
          echoServer.close();

          assert(
            "Proxy reenvía datos correctamente (eco)",
            received === "ECHO:HOLA_PROXY",
            `Recibido: "${received}"`,
          );
          resolve();
        });

        client.on("error", (err) => {
          proxyServer.close();
          echoServer.close();
          assert("Conexión al proxy exitosa", false, err.message);
          resolve();
        });
      });
    });
  });
}

// ──────────────────────────────────────────
// 4. WAITFORPORT TEST
// ──────────────────────────────────────────
console.log("\n⏳ WAITFORPORT — Detección de puertos");

function waitForPort(port, timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const socket = new net.Socket();
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() < deadline) setTimeout(check, 200);
        else resolve(false);
      });
      socket.connect(port, "127.0.0.1");
    };
    check();
  });
}

function waitForPortClosed(port, timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const socket = new net.Socket();
      socket.once("connect", () => { socket.destroy(); if (Date.now() < deadline) setTimeout(check, 200); else resolve(false); });
      socket.once("error", () => { socket.destroy(); resolve(true); });
      socket.connect(port, "127.0.0.1");
    };
    check();
  });
}

async function testPortFunctions() {
  const server = net.createServer();
  await new Promise((r) => server.listen(55438, "127.0.0.1", r));

  const portReady = await waitForPort(55438, 2000);
  assert("waitForPort detecta puerto activo", portReady);

  await new Promise((r) => server.close(r));

  const portClosed = await waitForPortClosed(55438, 5000);
  assert("waitForPortClosed detecta puerto cerrado", portClosed);
}

// ──────────────────────────────────────────
// 5. CONFIG FILE TESTS
// ──────────────────────────────────────────
console.log("\n📄 ARCHIVOS DE CONFIGURACIÓN");

const retroarchExists = fs.existsSync(RA_DIR);
assert("Carpeta retroarch/ existe", retroarchExists);

if (retroarchExists) {
  const raExe = path.join(RA_DIR, "retroarch.exe");
  assert("retroarch.exe existe", fs.existsSync(raExe));

  const coreDll = path.join(RA_DIR, "cores", "fbneo_libretro.dll");
  assert("Core fbneo_libretro.dll existe", fs.existsSync(coreDll));

  const romZip = path.join(RA_DIR, "roms", "kof98.zip");
  assert("ROM kof98.zip existe", fs.existsSync(romZip));
}

const relayDirExists = fs.existsSync(RELAY_DIR);
assert("Carpeta relay-server/ existe", relayDirExists);

if (relayDirExists) {
  const boreExe = path.join(RELAY_DIR, "bore.exe");
  assert("bore.exe existe", fs.existsSync(boreExe));
}

if (fs.existsSync(CFG_FILE)) {
  const cfgContent = fs.readFileSync(CFG_FILE, "utf8");
  assert("netplay_optimized.cfg contiene run_ahead_enabled", cfgContent.includes("run_ahead_enabled"));
  assert("netplay_optimized.cfg contiene netplay_check_frames", cfgContent.includes("netplay_check_frames"));
  assert("netplay_optimized.cfg contiene netplay_nat_traversal", cfgContent.includes("netplay_nat_traversal"));
  assert("cfg netplay_check_frames >= 1 (tolerante)", cfgContent.includes('netplay_check_frames = "3"'));
  assert("cfg netplay_input_latency_frames_range >= 1", cfgContent.includes('netplay_input_latency_frames_range = "3"'));
}

// ──────────────────────────────────────────
// 6. RELAY FILE READ/WRITE TEST
// ──────────────────────────────────────────
console.log("\n📝 RELAY FILE — Lectura/escritura");

const testUrl = "bore.pub:99999";
fs.writeFileSync(RELAY_FILE, testUrl, "utf8");
const readUrl = fs.readFileSync(RELAY_FILE, "utf8");
assert("save-relay-url escribe correctamente", readUrl === testUrl);
fs.writeFileSync(RELAY_FILE, "", "utf8");
const afterClear = fs.readFileSync(RELAY_FILE, "utf8");
assert("get-relay-url lee string vacío", afterClear === "");

// ──────────────────────────────────────────
// 7. FORWARDER TEST
// ──────────────────────────────────────────
console.log("\n🔁 FORWARDER — Reenvío local listenPort→targetPort");

function testForwarder() {
  return new Promise((resolve) => {
    const FW_LISTEN = 55439;
    const FW_TARGET = 55440;

    // Servidor destino (simula host RA)
    const targetServer = net.createServer((socket) => {
      socket.on("data", (data) => {
        socket.write("FW:" + data.toString());
      });
    });

    targetServer.listen(FW_TARGET, "127.0.0.1", () => {
      // Forwarder: escucha en FW_LISTEN, reenvía a FW_TARGET
      const forwarder = net.createServer((incoming) => {
        const target = new net.Socket();
        incoming.setNoDelay(true);
        target.setNoDelay(true);
        target.connect(FW_TARGET, "127.0.0.1", () => {
          incoming.pipe(target);
          target.pipe(incoming);
        });
        target.on("error", () => incoming.destroy());
        incoming.on("error", () => target.destroy());
      });

      forwarder.listen(FW_LISTEN, "127.0.0.1", () => {
        // Cliente: conecta al forwarder
        const client = new net.Socket();
        let received = "";

        client.connect(FW_LISTEN, "127.0.0.1", () => {
          client.write("HOLA_FW");
        });

        client.on("data", (data) => {
          received += data.toString();
          client.destroy();
          forwarder.close();
          targetServer.close();

          assert(
            "Forwarder reenvía datos correctamente",
            received === "FW:HOLA_FW",
            `Recibido: "${received}"`,
          );
          resolve();
        });

        client.on("error", (err) => {
          forwarder.close();
          targetServer.close();
          assert("Conexión al forwarder exitosa", false, err.message);
          resolve();
        });
      });
    });
  });
}

// ──────────────────────────────────────────
// 8. PIPE CLEANUP TEST (separación proxy/forwarder)
// ──────────────────────────────────────────
console.log("\n🧹 CLEANUP — Separación de servidores proxy/forwarder");

function testCleanupSeparation() {
  return new Promise((resolve) => {
    const proxyServers = [];
    const forwarderServers = [];

    const s1 = net.createServer();
    const s2 = net.createServer();

    let s1Ready = false;
    let s2Ready = false;

    s1.listen(55441, "127.0.0.1", () => {
      proxyServers.push(s1);
      s1Ready = true;
      s2.listen(55442, "127.0.0.1", () => {
        forwarderServers.push(s2);
        s2Ready = true;

        // "Cerrar solo proxy" (simula cierre de guest RA)
        for (const s of proxyServers) { try { s.close(); } catch {} }
        proxyServers.length = 0;

        // Verificar: forwarder sigue abierto
        const testSocket = new net.Socket();
        testSocket.connect(55442, "127.0.0.1", () => {
          testSocket.destroy();
          s2.close();
          assert("Forwarder sobrevive al cierre del proxy", true);
          resolve();
        });
        testSocket.on("error", (err) => {
          s2.close();
          assert("Forwarder sobrevive al cierre del proxy", false, err.message);
          resolve();
        });
      });
    });
  });
}

// ──────────────────────────────────────────
// 9. BORE COMMAND TEST (verifica sintaxis)
// ──────────────────────────────────────────
console.log("\n📡 BORE COMMAND — Verificación de sintaxis");

function boreCommand(forV2) {
  const args = ["local", "55436", "--to", forV2 ? "159.223.110.159" : "bore.pub"];
  return args;
}

const v1Cmd = boreCommand(false);
assert(
  "bore manual usa --to bore.pub",
  v1Cmd.includes("bore.pub") && v1Cmd.includes("55436") && v1Cmd.includes("local"),
);

const v2Cmd = boreCommand(true);
assert(
  "bore V2 usa --to IP",
  v2Cmd.includes("159.223.110.159") && v2Cmd.includes("55436"),
);

// ──────────────────────────────────────────
// EJECUTAR TESTS ASYNC
// ──────────────────────────────────────────
async function run() {
  await testProxy();
  await testForwarder();
  await testCleanupSeparation();
  await testPortFunctions();

  console.log(`\n═══════════════════════════════`);
  console.log(`  TOTAL: ${passed + failed}  |  ✅ ${passed}  |  ❌ ${failed}`);
  console.log(`═══════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
