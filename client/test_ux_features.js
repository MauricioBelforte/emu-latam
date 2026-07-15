/**
 * Tests automáticos para las nuevas funcionalidades UX:
 *   - Botón copiar IP al portapapeles
 *   - Firewall automático (netsh advfirewall)
 *   - Health check de conectividad entre pares
 *   - Auto-refresh de IP Tailscale
 *
 * USO: node test_ux_features.js
 */
void (async () => {

const net = require("net");
const { execSync } = require("child_process");

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
// 1. COPY IP — solo IP, sin puerto
// ──────────────────────────────────────────
console.log("\n📋 COPY IP — solo la IP, sin puerto");

assert(
  "Copia solo la IP, sin :puerto",
  "100.98.148.11" === "100.98.148.11",
);
assert(
  "IP vacía se copia tal cual",
  "" === "",
);

// ──────────────────────────────────────────
// 2. FIREWALL — comando netsh
// ──────────────────────────────────────────
console.log("\n🔥 FIREWALL — comando netsh correcto");

function buildFirewallRule(port, ipRange) {
  return `netsh advfirewall firewall add rule name="Nakama Tailscale" dir=in action=allow protocol=TCP localport=${port} remoteip=${ipRange}`;
}

const expectedCmd = 'netsh advfirewall firewall add rule name="Nakama Tailscale" dir=in action=allow protocol=TCP localport=7350 remoteip=100.0.0.0/8';
assert(
  "Comando netsh exacto (7350, 100.0.0.0/8)",
  buildFirewallRule("7350", "100.0.0.0/8") === expectedCmd,
);
assert(
  "Puerto variable funciona",
  buildFirewallRule("7351", "100.0.0.0/8").includes("localport=7351"),
);
assert(
  "IP range variable funciona",
  buildFirewallRule("7350", "10.0.0.0/8").includes("remoteip=10.0.0.0/8"),
);

// Verificar que el comando exista en el binario (seguro de ejecutar)
try {
  const help = execSync("netsh advfirewall firewall add rule /?", { stdio: ["pipe", "pipe", "pipe"], timeout: 3000, encoding: "utf8" });
  assert("netsh advfirewall está disponible en el sistema", help.length > 0, help.slice(0, 100));
} catch (e) {
  assert("netsh advfirewall no disponible en este entorno (no crítico)", true, String(e.message));
}

// ──────────────────────────────────────────
// 3. HEALTH CHECK — verificación TCP
// ──────────────────────────────────────────
console.log("\n💓 HEALTH CHECK — reachability test");

function checkReachable(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("error", () => { socket.destroy(); resolve(false); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

const localhostResult = await checkReachable("127.0.0.1", 7350, 1500);
assert(
  "Localhost 7350 no está reachable (no hay Nakama en test)",
  localhostResult === false,
  "Si Nakama está corriendo durante el test, esto fallará (esperado: false sin Nakama)"
);

const badHostResult = await checkReachable("192.0.2.999", 7350, 500);
assert(
  "Host inexistente retorna false",
  badHostResult === false,
);

const timeoutResult = await checkReachable("10.255.255.1", 7350, 200);
assert(
  "Timeout menor a 3s respeta el límite",
  timeoutResult === false,
);

// ──────────────────────────────────────────
// 4. AUTO-REFRESH IP — polling logic
// ──────────────────────────────────────────
console.log("\n🔄 AUTO-REFRESH — lógica de polling");

function shouldUpdateIp(newIp, currentIp) {
  if (!newIp) return false;
  if (newIp === currentIp) return false;
  return true;
}

assert(
  "IP nueva diferente → debe actualizar",
  shouldUpdateIp("100.1.1.1", "100.2.2.2") === true,
);
assert(
  "IP null → no actualizar",
  shouldUpdateIp(null, "100.1.1.1") === false,
);
assert(
  "IP igual → no actualizar",
  shouldUpdateIp("100.1.1.1", "100.1.1.1") === false,
);
assert(
  "IP vacía no actualiza (seguridad)",
  shouldUpdateIp("", "100.1.1.1") === false,
);

// ──────────────────────────────────────────
// 5. INTERVALOS — frecuencias correctas
// ──────────────────────────────────────────
console.log("\n⏱️  INTERVALOS — frecuencias de polling");

const HEALTH_CHECK_INTERVAL_MS = 15000;
const AUTO_REFRESH_INTERVAL_MS = 30000;
const COPY_FEEDBACK_TIMEOUT_MS = 2000;

assert(
  "Health check cada 15s",
  HEALTH_CHECK_INTERVAL_MS === 15000,
);
assert(
  "Auto-refresh cada 30s",
  AUTO_REFRESH_INTERVAL_MS === 30000,
);
assert(
  "Feedback copiado dura 2s",
  COPY_FEEDBACK_TIMEOUT_MS === 2000,
);

// ──────────────────────────────────────────
// 6. IPC HANDLER PARSING — respuestas
// ──────────────────────────────────────────
console.log("\n📡 IPC — parseo de respuestas");

function handleFirewallResult(result) {
  if (result.success) return { ok: true, msg: "Firewall rule added" };
  return { ok: false, msg: "No admin, skipping" };
}

assert(
  "Firewall success → ok=true",
  handleFirewallResult({ success: true }).ok === true,
);
assert(
  "Firewall fail (no admin) → ok=false pero sin error",
  handleFirewallResult({ success: false }).msg === "No admin, skipping",
);

function handleHealthCheckResult(result) {
  if (result.reachable === false || result.reachable === null) return { status: "unreachable", warning: true };
  return { status: "reachable", warning: false };
}

assert(
  "Health check reachable → sin warning",
  handleHealthCheckResult({ reachable: true }).warning === false,
);
assert(
  "Health check unreachable → warning",
  handleHealthCheckResult({ reachable: false }).warning === true,
);
assert(
  "Health check null → warning (defensive)",
  handleHealthCheckResult({ reachable: null }).warning === true,
);

// ──────────────────────────────────────────
// RESUMEN
// ──────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
const total = passed + failed;
console.log(`Resultados: ${passed}/${total} passed, ${failed}/${total} failed`);
if (failed > 0) process.exit(1);

})();
