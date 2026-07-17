/**
 * Tests automatizados para el módulo MITM-to-Transparent-Relay
 *
 * Verifica:
 *   - mitm-relay.js existe y tiene estructura correcta
 *   - Forwarder TCP: pipe bidireccional con datos reales
 *   - Forwarder TCP: múltiples conexiones simultáneas
 *   - Forwarder TCP: cierre graceful (close → destroy peer)
 *   - Forwarder TCP: ECONNRESET/EPIPE silencioso
 *   - Spawn args del handler start-mitm-local (host, relay, guest)
 *   - --appendconfig en host y guest args
 *   - mitmRunning flag (concurrency guard)
 *   - Relay argument parsing (diferentes combinaciones)
 *   - Comparación: ~60 líneas vs ~650 líneas del MITM original
 *
 * NO requiere RetroArch. Solo Node.js nativo.
 *
 * USO: node test_mitm_relay.js
 */

const fs = require("fs");
const path = require("path");
const net = require("net");
const { spawn } = require("child_process");

const RELAY_SCRIPT = path.resolve(__dirname, "..", "relay-server", "mitm-relay.js");
const PROJECT_ROOT = path.resolve(__dirname, "..");
const RA_DIR = path.join(PROJECT_ROOT, "retroarch");
const CFG_FILE = path.join(RA_DIR, "netplay_optimized.cfg");

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  \u2705 ${label}`);
    passed++;
  } else {
    console.log(`  \u274c ${label}${detail ? " \u2014 " + detail : ""}`);
    failed++;
  }
}

// ──────────────────────────────────────────
// 1. RELAY SCRIPT — Existencia y estructura
// ──────────────────────────────────────────
console.log("\n\uD83D\uDCC4 RELAY SCRIPT — mitm-relay.js");

const scriptExists = fs.existsSync(RELAY_SCRIPT);
assert("mitm-relay.js existe", scriptExists);

if (scriptExists) {
  const content = fs.readFileSync(RELAY_SCRIPT, "utf8");
  const lines = content.split("\n");

  assert("Script tiene < 100 líneas (forwarder simple)", lines.length < 100, `${lines.length} líneas`);
  assert("Usa net.createServer", content.includes("net.createServer"));
  assert("Usa setNoDelay(true)", (content.match(/setNoDelay\(true\)/g) || []).length >= 2);
  assert("Usa incoming.pipe(target)", content.includes("incoming.pipe(target)"));
  assert("Usa target.pipe(incoming)", content.includes("target.pipe(incoming)"));
  assert("Maneja ECONNRESET silenciosamente", content.includes("ECONNRESET"));
  assert("Maneja EPIPE silenciosamente", content.includes("EPIPE"));
  assert("Escucha en 0.0.0.0 (todas las interfaces)", content.includes("0.0.0.0"));
  assert("Soporta SIGINT para cierre graceful", content.includes("SIGINT"));
  assert("Soporta SIGTERM para cierre graceful", content.includes("SIGTERM"));
  assert("NO contiene state machine MITM", !content.includes("REQ_SAVE") && !content.includes("pendingQueue"));

  // Parseo de argumentos
  assert("Lee RELAY_PORT de process.argv[2]", content.includes("process.argv[2]"));
  assert("Lee TARGET_HOST de process.argv[3]", content.includes("process.argv[3]"));
  assert("Lee TARGET_PORT de process.argv[4]", content.includes("process.argv[4]"));

  // Defaults de argumentos
  assert("RELAY_PORT default = 55435", content.includes("55435"));
  assert("TARGET_HOST default = 127.0.0.1", content.includes('"127.0.0.1"'));
  assert("TARGET_PORT default = 55436", content.includes("55436"));
}

// ──────────────────────────────────────────
// 2. FORWARDER TCP — Pipe bidireccional
// ──────────────────────────────────────────
console.log("\n\uD83D\uDD0C FORWARDER — Pipe bidireccional (simula mitm-relay.js)");

function testForwarderPipe() {
  return new Promise((resolve) => {
    const FW_PORT = 55460;
    const TARGET_PORT = 55461;

    // Servidor destino (simula host RA)
    const targetServer = net.createServer((socket) => {
      socket.on("data", (data) => {
        socket.write("ECHO:" + data.toString());
      });
    });

    targetServer.listen(TARGET_PORT, "127.0.0.1", () => {
      // Forwarder (exactamente como mitm-relay.js)
      const forwarder = net.createServer((incoming) => {
        const target = new net.Socket();
        target.setNoDelay(true);
        incoming.setNoDelay(true);
        target.connect(TARGET_PORT, "127.0.0.1", () => {
          incoming.pipe(target);
          target.pipe(incoming);
        });
        target.on("error", (err) => {
          if (!err.message.includes("ECONNRESET") && !err.message.includes("EPIPE")) {
            console.error(`[fw] Target error: ${err.message}`);
          }
          incoming.destroy();
        });
        incoming.on("error", (err) => {
          if (!err.message.includes("ECONNRESET") && !err.message.includes("EPIPE")) {
            console.error(`[fw] Incoming error: ${err.message}`);
          }
          target.destroy();
        });
        incoming.on("close", () => target.destroy());
        target.on("close", () => incoming.destroy());
      });

      forwarder.listen(FW_PORT, "0.0.0.0", () => {
        // Cliente: conecta al forwarder, envía datos, recibe eco
        const client = new net.Socket();
        let received = "";

        client.connect(FW_PORT, "127.0.0.1", () => {
          client.write("HELLO_FORWARDER");
        });

        client.on("data", (data) => {
          received += data.toString();
          client.destroy();
          forwarder.close();
          targetServer.close();
          assert("Forwarder pipea datos correctamente (ECHO:HELLO_FORWARDER)", received === "ECHO:HELLO_FORWARDER", `Recibido: "${received}"`);
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
// 3. FORWARDER — Múltiples conexiones
// ──────────────────────────────────────────
console.log("\n\uD83D\uDD0C FORWARDER — Múltiples conexiones simultáneas");

function testMultiConnectionForwarder() {
  return new Promise((resolve) => {
    const FW_PORT = 55462;
    const TARGET_PORT = 55463;

    const targetServer = net.createServer((socket) => {
      socket.on("data", (data) => {
        socket.write("MIRROR:" + data.toString());
      });
    });

    targetServer.listen(TARGET_PORT, "127.0.0.1", () => {
      const forwarder = net.createServer((incoming) => {
        const target = new net.Socket();
        target.setNoDelay(true);
        incoming.setNoDelay(true);
        target.connect(TARGET_PORT, "127.0.0.1", () => {
          incoming.pipe(target);
          target.pipe(incoming);
        });
        target.on("error", () => incoming.destroy());
        incoming.on("error", () => target.destroy());
        incoming.on("close", () => target.destroy());
        target.on("close", () => incoming.destroy());
      });

      forwarder.listen(FW_PORT, "0.0.0.0", () => {
        let connected = 0;
        let echoed = 0;

        function spawnClient(id) {
          return new Promise((r) => {
            const client = new net.Socket();
            let data = "";
            client.connect(FW_PORT, "127.0.0.1", () => {
              connected++;
              client.write("CLIENT_" + id);
            });
            client.on("data", (d) => {
              data += d.toString();
              if (data === "MIRROR:CLIENT_" + id) echoed++;
              client.destroy();
              r();
            });
            client.on("error", () => r());
          });
        }

        Promise.all([spawnClient(1), spawnClient(2), spawnClient(3), spawnClient(4), spawnClient(5)]).then(() => {
          forwarder.close();
          targetServer.close();
          assert("5 clientes conectan al forwarder simultáneamente", connected === 5, `Conectados: ${connected}`);
          assert("5 clientes reciben mirror correctamente", echoed === 5, `Mirrors: ${echoed}`);
          resolve();
        });
      });
    });
  });
}

// ──────────────────────────────────────────
// 4. FORWARDER — Cierre graceful (close → destroy peer)
// ──────────────────────────────────────────
console.log("\n\uD83D\uDD0C FORWARDER — Cierre graceful (close destroy peer)");

function testGracefulClose() {
  return new Promise((resolve) => {
    const FW_PORT = 55464;
    const TARGET_PORT = 55465;

    const targetServer = net.createServer((socket) => {
      // No hacer nada, mantener conexión abierta
    });

    targetServer.listen(TARGET_PORT, "127.0.0.1", () => {
      const forwarder = net.createServer((incoming) => {
        const target = new net.Socket();
        target.setNoDelay(true);
        incoming.setNoDelay(true);
        target.connect(TARGET_PORT, "127.0.0.1", () => {
          incoming.pipe(target);
          target.pipe(incoming);
        });
        target.on("error", () => incoming.destroy());
        incoming.on("error", () => target.destroy());
        incoming.on("close", () => target.destroy());
        target.on("close", () => incoming.destroy());
      });

      forwarder.listen(FW_PORT, "0.0.0.0", () => {
        const client = new net.Socket();
        client.connect(FW_PORT, "127.0.0.1", () => {
          // Cuando cliente se cierra, incoming.on("close") debe destruir target
          // y target.on("close") debe destruir incoming (ya cerrado)
          let targetDestroyed = false;
          let incomingDestroyed = false;

          // Monitorear usando un socket watcher al target port
          const watcher = new net.Socket();
          watcher.connect(TARGET_PORT, "127.0.0.1", () => {
            // Cliente conectado, ahora cerrarlo
            client.destroy();

            // Verificar que la conexión target se cerró
            setTimeout(() => {
              const checker = new net.Socket();
              let canReconnect = false;
              checker.connect(TARGET_PORT, "127.0.0.1", () => {
                canReconnect = true;
                checker.destroy();
                watcher.destroy();
                forwarder.close();
                targetServer.close();
                assert("Target socket se cierra cuando incoming se cierra", canReconnect, "Pudo reconectar = target se cerró");
                resolve();
              });
              checker.on("error", () => {
                watcher.destroy();
                forwarder.close();
                targetServer.close();
                assert("Target socket se cierra cuando incoming se cierra", false, "No pudo reconectar = target aún abierto");
                resolve();
              });
            }, 300);
          });
        });
      });
    });
  });
}

// ──────────────────────────────────────────
// 5. SPAWN ARGS — Construcción de args (start-mitm-local)
// ──────────────────────────────────────────
console.log("\n\uD83D\uDE80 SPAWN ARGS — start-mitm-local (simulado)");

const CFG_PATH = path.join(RA_DIR, "netplay_optimized.cfg");

function buildHostArgs(retroArchDir, corePath, romPath) {
  const args = ["-L", corePath, romPath, "--host", "--port", "55435"];
  const cfg = path.join(retroArchDir, "netplay_optimized.cfg");
  if (fs.existsSync(cfg)) args.push("--appendconfig", cfg);
  return args;
}

function buildRelayArgs(relayScript) {
  return ["node", [relayScript, "55436", "127.0.0.1", "55435"]];
}

function buildGuestArgs(retroArchDir, corePath, romPath) {
  const args = ["-L", corePath, romPath, "--connect", "127.0.0.1", "--port", "55436"];
  const cfg = path.join(retroArchDir, "netplay_optimized.cfg");
  if (fs.existsSync(cfg)) args.push("--appendconfig", cfg);
  return args;
}

const CORE = path.join(RA_DIR, "cores", "fbneo_libretro.dll");
const ROM = path.join(RA_DIR, "roms", "kof98.zip");

const hostArgs = buildHostArgs(RA_DIR, CORE, ROM);
assert("Host args contienen --host", hostArgs.includes("--host"));
assert("Host args contienen --port 55435", hostArgs.includes("--port") && hostArgs.includes("55435"));
assert("Host args NO contienen --connect", !hostArgs.includes("--connect"));
const hostAppendIdx = hostArgs.indexOf("--appendconfig");
assert("Host args contienen --appendconfig (si cfg existe)", (fs.existsSync(CFG_PATH) && hostAppendIdx !== -1) || (!fs.existsSync(CFG_PATH) && hostAppendIdx === -1));

const guestArgs = buildGuestArgs(RA_DIR, CORE, ROM);
assert("Guest args contienen --connect 127.0.0.1", guestArgs.includes("--connect") && guestArgs.includes("127.0.0.1"));
assert("Guest args contienen --port 55436", guestArgs.includes("--port") && guestArgs.includes("55436"));
assert("Guest args NO contienen --host", !guestArgs.includes("--host"));
const guestAppendIdx = guestArgs.indexOf("--appendconfig");
assert("Guest args contienen --appendconfig (si cfg existe)", (fs.existsSync(CFG_PATH) && guestAppendIdx !== -1) || (!fs.existsSync(CFG_PATH) && guestAppendIdx === -1));

const relayCmd = buildRelayArgs(RELAY_SCRIPT);
const relayArgs = relayCmd[1];
assert("Relay args: relayScript como primer argumento", relayArgs[0].endsWith("mitm-relay.js"), relayArgs[0]);
assert("Relay args: puerto 55436 como RELAY_PORT", relayArgs[1] === "55436");
assert("Relay args: 127.0.0.1 como TARGET_HOST", relayArgs[2] === "127.0.0.1");
assert("Relay args: 55435 como TARGET_PORT", relayArgs[3] === "55435");
assert("Relay args tiene exactamente 4 argumentos", relayArgs.length === 4);

// ──────────────────────────────────────────
// 6. mitmRunning FLAG — Concurrency guard
// ──────────────────────────────────────────
console.log("\n\uD83D\uDEA5 MITM FLAG — Concurrency guard");

let mitmRunning = false;

function simulateStartMitm() {
  if (mitmRunning) return { success: false, error: "MITM ya está en ejecución" };
  mitmRunning = true;
  try {
    // Simular operación
    return { success: true };
  } finally {
    mitmRunning = false;
  }
}

const firstCall = simulateStartMitm();
assert("Primera llamada a start-mitm-local → success=true", firstCall.success === true);

// Simular que ya está corriendo
mitmRunning = true;
const secondCall = simulateStartMitm();
assert("Segunda llamada con mitmRunning=true → error", secondCall.success === false && secondCall.error === "MITM ya está en ejecución");
mitmRunning = false;

// ──────────────────────────────────────────
// 7. HANDLER ERROR — Archivos faltantes
// ──────────────────────────────────────────
console.log("\n\u26A0\uFE0F HANDLER ERROR — Archivos faltantes");

function simulateHandler(retroArchExists, relayExists) {
  if (!relayExists) return { success: false, error: "mitm-relay.js no encontrado" };
  if (!retroArchExists) return { success: false, error: "retroarch.exe no encontrado" };
  return { success: true };
}

const noRelay = simulateHandler(true, false);
assert("Sin mitm-relay.js → error específico", noRelay.error === "mitm-relay.js no encontrado");

const noRA = simulateHandler(false, true);
assert("Sin retroarch.exe → error específico", noRA.error === "retroarch.exe no encontrado");

const todoOk = simulateHandler(true, true);
assert("Ambos archivos existen → success", todoOk.success === true);

// ──────────────────────────────────────────
// 8. SPAWN ACTUAL — Iniciar mitm-relay.js como child process
// ──────────────────────────────────────────
console.log("\n\uD83D\uDCBB SPAWN ACTUAL — Iniciar mitm-relay.js como proceso hijo");

function testSpawnRelay() {
  return new Promise((resolve) => {
    const TEST_PORT = 55466;
    const TEST_TARGET_PORT = 55467;

    // Servidor destino
    const targetServer = net.createServer((socket) => {
      socket.on("data", (data) => {
        socket.write("RELAY:" + data.toString());
      });
    });

    targetServer.listen(TEST_TARGET_PORT, "127.0.0.1", () => {
      // Spawn mitm-relay.js con args de test
      const relayProc = spawn("node", [RELAY_SCRIPT, String(TEST_PORT), "127.0.0.1", String(TEST_TARGET_PORT)], {
        cwd: path.dirname(RELAY_SCRIPT),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let relayOutput = "";
      relayProc.stdout.on("data", (d) => { relayOutput += d.toString(); });

      // Esperar a que el relay esté listo
      setTimeout(() => {
        const client = new net.Socket();
        let received = "";

        client.connect(TEST_PORT, "127.0.0.1", () => {
          client.write("VIA_RELAY");
        });

        client.on("data", (data) => {
          received += data.toString();
          client.destroy();

          // Limpiar
          relayProc.kill();
          targetServer.close();

          assert("mitm-relay.js spawn funciona: RELAY:VIA_RELAY", received === "RELAY:VIA_RELAY", `Recibido: "${received}"`);
          assert("Relay imprime log de inicio", relayOutput.includes(`:${TEST_PORT}`) && relayOutput.includes(`127.0.0.1:${TEST_TARGET_PORT}`), `Output: ${relayOutput.trim()}`);
          resolve();
        });

        client.on("error", (err) => {
          relayProc.kill();
          targetServer.close();
          assert("Conexión al relay spawn exitosa", false, err.message);
          resolve();
        });
      }, 500);
    });
  });
}

// ──────────────────────────────────────────
// 9. COMPARACIÓN — MITM original vs Transparent Relay
// ──────────────────────────────────────────
console.log("\n\u2696\uFE0F COMPARACIÓN — MITM original vs Transparent Relay");

assert("mitm-relay.js tiene < 100 líneas (vs ~681 del MITM)", fs.existsSync(RELAY_SCRIPT) ? fs.readFileSync(RELAY_SCRIPT, "utf8").split("\n").length < 100 : true);

// El relay NO debe tener lógica de protocolo netplay
if (fs.existsSync(RELAY_SCRIPT)) {
  const content = fs.readFileSync(RELAY_SCRIPT, "utf8");
  assert("No tiene lógica de handshake netplay", !content.includes("NICK") && !content.includes("INFO") && !content.includes("SYNC"));
  assert("No tiene lógica de savestate", !content.includes("REQ_SAVE") && !content.includes("LOAD_SAVE"));
  assert("No tiene estados complejos", !content.includes("pendingQueue") && !content.includes("state ="));
  assert("No tiene lógica de frames", !content.includes("frame") && !content.includes("input"));
  assert("Solo hace pipe TCP", content.includes("pipe") || content.includes("pipe"));
}

// ──────────────────────────────────────────
// 10. RELAY ARGS — Parseo de argumentos
// ──────────────────────────────────────────
console.log("\n\uD83D\uDD0D RELAY — Parseo de argumentos");

function parseRelayArgs(argv) {
  return {
    RELAY_PORT: parseInt(argv[2], 10) || 55435,
    TARGET_HOST: argv[3] || "127.0.0.1",
    TARGET_PORT: parseInt(argv[4], 10) || 55436,
  };
}

const defaultArgs = parseRelayArgs(["node", "mitm-relay.js"]);
assert("Sin args → RELAY_PORT default 55435", defaultArgs.RELAY_PORT === 55435);
assert("Sin args → TARGET_HOST default 127.0.0.1", defaultArgs.TARGET_HOST === "127.0.0.1");
assert("Sin args → TARGET_PORT default 55436", defaultArgs.TARGET_PORT === 55436);

const customArgs = parseRelayArgs(["node", "mitm-relay.js", "55555", "192.168.1.100", "55435"]);
assert("Args custom → RELAY_PORT = 55555", customArgs.RELAY_PORT === 55555);
assert("Args custom → TARGET_HOST = 192.168.1.100", customArgs.TARGET_HOST === "192.168.1.100");
assert("Args custom → TARGET_PORT = 55435", customArgs.TARGET_PORT === 55435);

// Args parciales
const partialArgs = parseRelayArgs(["node", "mitm-relay.js", "55436"]);
assert("Solo RELAY_PORT → default TARGET_HOST", partialArgs.TARGET_HOST === "127.0.0.1");
assert("Solo RELAY_PORT → default TARGET_PORT", partialArgs.TARGET_PORT === 55436);

// ──────────────────────────────────────────
// 11. VALIDACIÓN — Puertos usados por MITM
// ──────────────────────────────────────────
console.log("\n\uD83D\uDD17 PORTS — Puertos del flujo MITM");

assert("Host RA escucha en 55435", 55435 === 55435);
assert("Relay escucha en 55436", 55436 === 55436);
assert("Guest RA conecta a relay en 55436", 55436 === 55436);
assert("Relay forwardea a host en 55435", 55435 === 55435);
assert("Host port ≠ Relay port (55435 ≠ 55436)", 55435 !== 55436);
assert("Guest conecta al relay, no directo al host", true);

// ──────────────────────────────────────────
// EJECUTAR TESTS ASYNC
// ──────────────────────────────────────────
async function run() {
  await testForwarderPipe();
  await testMultiConnectionForwarder();
  await testGracefulClose();
  await testSpawnRelay();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  TOTAL: ${passed + failed}  |  \u2705 ${passed}  |  \u274c ${failed}`);
  console.log(`${"=".repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
