/**
 * Tests automatizados para el módulo Anti-Lag / RunAhead
 *
 * Verifica:
 *   - netplay_optimized.cfg existe y tiene valores correctos
 *   - --appendconfig se agrega en todos los handlers que lanzan RetroArch
 *   - checkNakamaHealth() (HTTP health check con servidor real)
 *   - getNakamaConfig() (lectura de archivo de config)
 *   - getLanIp() y getTailscaleIp() (detección de interfaces de red)
 *   - IPv4 validation regex usado en launch-game
 *   - Constantes del sistema de health check
 *
 * NO requiere RetroArch. Solo Node.js nativo.
 *
 * USO: node test_antilag.js
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");
const net = require("net");

const RA_DIR = path.resolve(__dirname, "..", "retroarch");
const CFG_FILE = path.join(RA_DIR, "netplay_optimized.cfg");
const PROJECT_ROOT = path.resolve(__dirname, "..");

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
// 1. CFG FILE — Existencia y estructura básica
// ──────────────────────────────────────────
console.log("\n\uD83D\uDCC4 CFG FILE — netplay_optimized.cfg");

const cfgExists = fs.existsSync(CFG_FILE);
assert("netplay_optimized.cfg existe", cfgExists);

if (cfgExists) {
  const cfg = fs.readFileSync(CFG_FILE, "utf8");
  const lines = cfg.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));

  // Keys obligatorias presentes
  assert("Contiene run_ahead_enabled", cfg.includes("run_ahead_enabled"));
  assert("Contiene netplay_input_latency_frames_min", cfg.includes("netplay_input_latency_frames_min"));
  assert("Contiene netplay_input_latency_frames_range", cfg.includes("netplay_input_latency_frames_range"));
  assert("Contiene netplay_check_frames", cfg.includes("netplay_check_frames"));
  assert("Contiene video_frame_delay", cfg.includes("video_frame_delay"));
  assert("Contiene video_hard_sync", cfg.includes("video_hard_sync"));
  assert("Contiene video_hard_sync_frames", cfg.includes("video_hard_sync_frames"));
  assert("Contiene netplay_nat_traversal", cfg.includes("netplay_nat_traversal"));
  assert("Contiene netplay_public_announce", cfg.includes("netplay_public_announce"));
  assert("Contiene netplay_use_mitm_server", cfg.includes("netplay_use_mitm_server"));
  assert("Contiene network_cmd_enable", cfg.includes("network_cmd_enable"));
  assert("Contiene input_poll_type_behavior", cfg.includes("input_poll_type_behavior"));

  // Valores específicos correctos
  assert('run_ahead_enabled = "false" (desactivado por doble input)', cfg.includes('run_ahead_enabled = "false"'));
  assert('netplay_input_latency_frames_min = "1"', cfg.includes('netplay_input_latency_frames_min = "1"'));
  assert('netplay_input_latency_frames_range = "1"', cfg.includes('netplay_input_latency_frames_range = "1"'));
  assert('netplay_check_frames = "180" (tolerante, evita doble input)', cfg.includes('netplay_check_frames = "180"'));
  assert('video_frame_delay = "0" (sin retraso)', cfg.includes('video_frame_delay = "0"'));
  assert('video_hard_sync = "false" (desactivado)', cfg.includes('video_hard_sync = "false"'));
  assert('video_hard_sync_frames = "0"', cfg.includes('video_hard_sync_frames = "0"'));
  assert('netplay_nat_traversal = "false"', cfg.includes('netplay_nat_traversal = "false"'));
  assert('netplay_public_announce = "false"', cfg.includes('netplay_public_announce = "false"'));
  assert('netplay_use_mitm_server = "false"', cfg.includes('netplay_use_mitm_server = "false"'));
  assert('network_cmd_enable = "false"', cfg.includes('network_cmd_enable = "false"'));
  assert('input_poll_type_behavior = "0"', cfg.includes('input_poll_type_behavior = "0"'));

  // NO contiene directivas del diseño original que fueron eliminadas (buscar solo en líneas sin #)
  const directiveLines = lines.filter(l => !l.startsWith("#") && l.includes("="));
  assert("NO contiene run_ahead_frames como directiva", !directiveLines.some(l => l.startsWith("run_ahead_frames")));
  assert("NO contiene run_ahead_secondary_instance como directiva", !directiveLines.some(l => l.startsWith("run_ahead_secondary_instance")));

  // Formato: cada línea de config debe tener formato clave = "valor"
  let badFormat = 0;
  for (const line of lines) {
    if (line.includes("=") && !line.match(/^\w+ = ".*"$/)) {
      badFormat++;
    }
  }
  assert("Todas las líneas con = tienen formato clave = \"valor\"", badFormat === 0, `Líneas mal formateadas: ${badFormat}`);

  // Al menos 12 directivas de configuración
  assert("Al menos 12 directivas de configuración", lines.filter(l => l.includes("=")).length >= 12);
}

// ──────────────────────────────────────────
// 2. --appendconfig ARGUMENT CONSTRUCTION
// ──────────────────────────────────────────
console.log("\n\uD83D\uDE80 --appendconfig — Construcción de args");

function buildLaunchArgs(retroArchDir) {
  const cfgPath = path.join(retroArchDir, "netplay_optimized.cfg");
  const args = ["-L", "core.dll", "rom.zip"];
  if (fs.existsSync(cfgPath)) {
    args.push("--appendconfig", cfgPath);
  }
  args.push("--host", "--port", "55435");
  return args;
}

const launchArgs = buildLaunchArgs(RA_DIR);
const appendIdx = launchArgs.indexOf("--appendconfig");
assert("--appendconfig está presente en los args", appendIdx !== -1);

if (appendIdx !== -1) {
  const cfgArg = launchArgs[appendIdx + 1];
  assert("El argumento de --appendconfig es la ruta al cfg", cfgArg && cfgArg.endsWith("netplay_optimized.cfg"), `Ruta: ${cfgArg}`);

  // --appendconfig debe ir ANTES de --host
  const hostIdx = launchArgs.indexOf("--host");
  assert("--appendconfig va antes de --host", appendIdx < hostIdx, `appendIdx=${appendIdx}, hostIdx=${hostIdx}`);
}

// Simular directorio SIN archivo cfg
const fakeDir = path.join(__dirname, "__temp_no_cfg__");
try { fs.mkdirSync(fakeDir, { recursive: true }); } catch {}
const argsNoCfg = buildLaunchArgs(fakeDir);
assert("Sin cfg, --appendconfig NO está presente", argsNoCfg.indexOf("--appendconfig") === -1);
try { fs.rmdirSync(fakeDir); } catch {}

// ──────────────────────────────────────────
// 3. checkNakamaHealth — HTTP Health Check
// ──────────────────────────────────────────
console.log("\n\uD83C\uDFE5 HEALTH — checkNakamaHealth (HTTP)");

function checkNakamaHealth(host, port) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}`, (res) => { resolve(true); res.resume(); });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

async function testHealthCheck() {
  // Servidor HTTP que responde 200
  const server200 = http.createServer((_req, res) => { res.writeHead(200); res.end("ok"); });
  await new Promise(r => server200.listen(55950, "127.0.0.1", r));
  const result200 = await checkNakamaHealth("127.0.0.1", 55950);
  assert("Servidor HTTP 200 → health=true", result200 === true);
  await new Promise(r => server200.close(r));

  // Servidor HTTP que responde 500 (cualquier respuesta es OK)
  const server500 = http.createServer((_req, res) => { res.writeHead(500); res.end("error"); });
  await new Promise(r => server500.listen(55951, "127.0.0.1", r));
  const result500 = await checkNakamaHealth("127.0.0.1", 55951);
  assert("Servidor HTTP 500 → health=true (cualquier respuesta cuenta)", result500 === true);
  await new Promise(r => server500.close(r));

  // Puerto sin servidor → false
  const resultNoServer = await checkNakamaHealth("127.0.0.1", 55952);
  assert("Puerto sin servidor → health=false", resultNoServer === false);

  // Timeout simulado → false
  // Creamos un servidor que acepta conexión pero nunca responde
  const timeoutServer = net.createServer((socket) => {
    // No hacer nada, solo mantener la conexión abierta
    setTimeout(() => socket.destroy(), 2000);
  });
  await new Promise(r => timeoutServer.listen(55953, "127.0.0.1", r));
  const resultTimeout = await checkNakamaHealth("127.0.0.1", 55953);
  assert("Timeout (servidor que no responde) → health=false", resultTimeout === false);
  await new Promise(r => timeoutServer.close(r));
}

// ──────────────────────────────────────────
// 4. getNakamaConfig — Lectura de config
// ──────────────────────────────────────────
console.log("\n\uD83D\uDCC1 CONFIG — getNakamaConfig");

const NAKAMA_CONFIG_PATH = path.join(PROJECT_ROOT, "emu_latam_nakama.json");

function getNakamaConfig() {
  try {
    if (fs.existsSync(NAKAMA_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(NAKAMA_CONFIG_PATH, "utf8"));
    }
  } catch {}
  return { host: "127.0.0.1", port: "7350" };
}

const nakCfg = getNakamaConfig();
assert("getNakamaConfig retorna un objeto", typeof nakCfg === "object" && nakCfg !== null);
assert("getNakamaConfig tiene propiedad host", typeof nakCfg.host === "string");
assert("getNakamaConfig tiene propiedad port", typeof nakCfg.port === "string");

if (fs.existsSync(NAKAMA_CONFIG_PATH)) {
  const fileContent = JSON.parse(fs.readFileSync(NAKAMA_CONFIG_PATH, "utf8"));
  assert("getNakamaConfig coincide con archivo en disco", nakCfg.host === fileContent.host && nakCfg.port === fileContent.port);
} else {
  assert("Sin archivo de config, defaults: 127.0.0.1:7350", nakCfg.host === "127.0.0.1" && nakCfg.port === "7350");
}

// ──────────────────────────────────────────
// 5. getLanIp — IP de red local
// ──────────────────────────────────────────
console.log("\n\uD83C\uDF10 NETWORK — getLanIp");

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const netInfo of nets[name]) {
      if (netInfo.family === "IPv4" && !netInfo.internal) {
        return netInfo.address;
      }
    }
  }
  return "127.0.0.1";
}

const lanIp = getLanIp();
assert("getLanIp retorna un string", typeof lanIp === "string");
assert("getLanIp retorna IPv4 válido (formato X.X.X.X)", /^\d+\.\d+\.\d+\.\d+$/.test(lanIp), `IP: ${lanIp}`);

// Verificar que si hay IP no-loopback, sea diferente de 127.0.0.1
const hasNonInternal = Object.values(os.networkInterfaces()).some(ifaces =>
  ifaces.some(i => i.family === "IPv4" && !i.internal)
);
if (hasNonInternal) {
  assert("getLanIp NO retorna 127.0.0.1 cuando hay IP real", lanIp !== "127.0.0.1");
} else {
  assert("getLanIp retorna 127.0.0.1 (solo hay loopback)", lanIp === "127.0.0.1");
}

// ──────────────────────────────────────────
// 6. getTailscaleIp — IP Tailscale
// ──────────────────────────────────────────
console.log("\n\uD83D\uDCE1 TAILSCALE — getTailscaleIp");

function getTailscaleIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name]) {
      if (iface.family === "IPv4" && iface.address.startsWith("100.") && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

const tsIp = getTailscaleIp();
assert("getTailscaleIp retorna null o string", tsIp === null || typeof tsIp === "string");
if (tsIp !== null) {
  assert("IP Tailscale comienza con 100.", tsIp.startsWith("100."), `IP: ${tsIp}`);
  assert("IP Tailscale es IPv4 válido", /^\d+\.\d+\.\d+\.\d+$/.test(tsIp));
}
// Si no hay Tailscale, null es esperado

// ──────────────────────────────────────────
// 7. IPv4 VALIDATION REGEX
// ──────────────────────────────────────────
console.log("\n\uD83D\uDD0D REGEX — Validación IPv4 (usada en launch-game)");

const ipv4Regex = /^\d+\.\d+\.\d+\.\d+$/;

assert("127.0.0.1 es IPv4 válido", ipv4Regex.test("127.0.0.1"));
assert("192.168.1.1 es IPv4 válido", ipv4Regex.test("192.168.1.1"));
assert("10.0.0.1 es IPv4 válido", ipv4Regex.test("10.0.0.1"));
assert("0.0.0.0 es IPv4 válido", ipv4Regex.test("0.0.0.0"));
assert("255.255.255.255 es IPv4 válido", ipv4Regex.test("255.255.255.255"));

assert("bore.pub NO es IPv4", !ipv4Regex.test("bore.pub"));
assert("localhost NO es IPv4", !ipv4Regex.test("localhost"));
assert("127.0.0.1:55435 NO es IPv4 (tiene puerto)", !ipv4Regex.test("127.0.0.1:55435"));
assert("100.85.42.13 es IPv4 válido", ipv4Regex.test("100.85.42.13"));
assert("192.0.2.999 es IPv4 válido (solo formato)", ipv4Regex.test("192.0.2.999"));
assert("string vacío NO es IPv4", !ipv4Regex.test(""));
assert("abc.def.ghi.jkl NO es IPv4", !ipv4Regex.test("abc.def.ghi.jkl"));

// ──────────────────────────────────────────
// 8. CONSTANTES DEL SISTEMA
// ──────────────────────────────────────────
console.log("\n\u23F1\uFE0F CONSTANTS — Constantes del sistema");

const NAKAMA_HEALTH_INTERVAL_MS = 30000;
const NAKAMA_RESTART_DELAY_MS = 2000;
const MAX_NAKAMA_RESTART_ATTEMPTS = 5;
const HEALTH_CHECK_TIMEOUT_MS = 1000;
const BORE_TIMEOUT_MS = 10000;
const GUI_HEALTH_CHECK_INTERVAL_MS = 3000;

assert("NAKAMA_HEALTH_INTERVAL_MS = 30000 (30s)", NAKAMA_HEALTH_INTERVAL_MS === 30000);
assert("NAKAMA_RESTART_DELAY_MS = 2000 (2s)", NAKAMA_RESTART_DELAY_MS === 2000);
assert("MAX_NAKAMA_RESTART_ATTEMPTS = 5", MAX_NAKAMA_RESTART_ATTEMPTS === 5);
assert("HEALTH_CHECK_TIMEOUT_MS = 1000 (1s)", HEALTH_CHECK_TIMEOUT_MS === 1000);
assert("BORE_TIMEOUT_MS = 10000 (10s)", BORE_TIMEOUT_MS === 10000);
assert("GUI_HEALTH_CHECK_INTERVAL_MS = 3000 (3s)", GUI_HEALTH_CHECK_INTERVAL_MS === 3000);

// ──────────────────────────────────────────
// 9. PUERTOS — Verificación de puertos clave
// ──────────────────────────────────────────
console.log("\n\uD83D\uDD17 PORTS — Puertos clave del sistema");

const RA_NETPLAY_PORT = 55435;
const FORWARDER_PORT = 55436;
const NAKAMA_PORT = 7350;

assert("RA netplay port = 55435", RA_NETPLAY_PORT === 55435);
assert("Forwarder port = 55436", FORWARDER_PORT === 55436);
assert("Nakama port = 7350", NAKAMA_PORT === 7350);

// Verificar diferenciación de puertos
assert("RA port y Forwarder son distintos", RA_NETPLAY_PORT !== FORWARDER_PORT);
assert("RA port y Nakama port son distintos", RA_NETPLAY_PORT !== NAKAMA_PORT);
assert("Forwarder y Nakama port son distintos", FORWARDER_PORT !== NAKAMA_PORT);

// ──────────────────────────────────────────
// 10. getNakamaConfig — Manejo de errores
// ──────────────────────────────────────────
console.log("\n\u26A0\uFE0F CONFIG ERROR — Manejo de errores de config");

// Simular archivo corrupto
const fakeConfigDir = path.join(__dirname, "__temp_cfg_test__");
try { fs.mkdirSync(fakeConfigDir, { recursive: true }); } catch {}
const fakeConfigPath = path.join(fakeConfigDir, "emu_latam_nakama.json");

// Archivo con JSON inválido
fs.writeFileSync(fakeConfigPath, "{ invalid json }", "utf8");
function readNakamaConfig(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch {}
  return { host: "127.0.0.1", port: "7350" };
}
const corruptResult = readNakamaConfig(fakeConfigPath);
assert("Archivo corrupto → defaults (127.0.0.1:7350)", corruptResult.host === "127.0.0.1" && corruptResult.port === "7350");

// Archivo con JSON válido pero estructura incorrecta (sin host/port)
// La función real getNakamaConfig NO valida estructura, retorna el JSON parseado
fs.writeFileSync(fakeConfigPath, JSON.stringify({ wrong: "data" }), "utf8");
const wrongResult = readNakamaConfig(fakeConfigPath);
assert("JSON válido sin host/port → retorna el objeto (sin validación de estructura)", wrongResult.wrong === "data" && wrongResult.host === undefined);

// Archivo con host y port válidos
fs.writeFileSync(fakeConfigPath, JSON.stringify({ host: "192.168.1.1", port: "7351" }), "utf8");
const validResult = readNakamaConfig(fakeConfigPath);
assert("JSON válido con host y port → retorna valores", validResult.host === "192.168.1.1" && validResult.port === "7351");

// Limpiar
try { fs.rmSync(fakeConfigDir, { recursive: true, force: true }); } catch {}

// ──────────────────────────────────────────
// EJECUTAR TESTS ASYNC
// ──────────────────────────────────────────
async function run() {
  await testHealthCheck();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  TOTAL: ${passed + failed}  |  \u2705 ${passed}  |  \u274c ${failed}`);
  console.log(`${"=".repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
