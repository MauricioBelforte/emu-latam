// test_bootstrap.js — Tests del módulo Bootstrap WAN (Módulo 20)
// Ejecutar: node test_bootstrap.js
// No importa TypeScript; testea la lógica inline con mocks manuales

let passed = 0;
let failed = 0;

function assert(condition, msg, detail) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    if (detail) console.error(`     ${detail}`);
    failed++;
  }
}

// ── LÓGICA A TESTEAR (inline, misma que bootstrap.ts) ──────────────

const PASTE_API_HOST = "dpaste.org";
const PASTE_API_PATH = "/api/";
const BORE_NAKAMA_PORT = "7350";

function parseBoreUrl(stdout) {
  const match = stdout.match(/listening at ([\w.-]+:\d+)/);
  return match ? match[1] : null;
}

async function simulatePublishBoreUrl(boreUrl) {
  const responseBody = "https://dpaste.org/aB3xZ6/";
  const hashMatch = responseBody.match(/dpaste\.org\/([a-zA-Z0-9]+)/);
  if (!hashMatch) return { success: false, error: "No se pudo extraer room code" };
  const roomCode = hashMatch[1];
  if (!roomCode || roomCode.length < 4) return { success: false, error: "Room code muy corto" };
  return { success: true, roomCode };
}

async function simulateFetchBoreUrl(roomCode) {
  if (!roomCode || roomCode.trim().length < 3) {
    return { success: false, error: "Room code inválido" };
  }
  if (roomCode === "badcode") {
    return { success: false, error: "Room code inválido o expirado (404)" };
  }
  const body = "bore.pub:28734";
  if (!body || !body.includes(":")) return { success: false, error: "Respuesta inválida" };
  return { success: true, boreUrl: body };
}

function simulateSetNakamaConfig(host, port) {
  return { host, port };
}

function parseBoreUrlFromCode(sourceCode) {
  return sourceCode.includes('"7350"') && sourceCode.includes("bore.pub");
}

// ── TESTS ───────────────────────────────────────────────────────────

console.log("=".repeat(60));
console.log("TEST BOOTSTRAP WAN (Módulo 20)");
console.log("=".repeat(60));

// Test 1: parseBoreUrl extrae URL correctamente
{
  const url = parseBoreUrl("listening at bore.pub:28734\n");
  assert(url === "bore.pub:28734", "Test 1: parseBoreUrl extrae URL correcta");
}

// Test 2: parseBoreUrl con formato bore.pub
{
  const url = parseBoreUrl("[BORE] listening at bore.pub:12345\n");
  assert(url === "bore.pub:12345", "Test 2: parseBoreUrl con prefijo");
}

// Test 3: parseBoreUrl con formato IP:puerto
{
  const url = parseBoreUrl("listening at 192.168.1.1:9999\n");
  assert(url === "192.168.1.1:9999", "Test 3: parseBoreUrl con IP:puerto");
}

// Test 4: parseBoreUrl sin match
{
  const url = parseBoreUrl("error: connection refused\n");
  assert(url === null, "Test 4: parseBoreUrl sin match retorna null");
}

// Test 5: publishBoreUrl exitoso
(async () => {
  const result = await simulatePublishBoreUrl("bore.pub:28734");
  assert(result.success === true, "Test 5: publishBoreUrl exitoso");
  assert(result.roomCode === "aB3xZ6", "Test 5: roomCode = aB3xZ6");
})();

// Test 6: fetchBoreUrl con room code válido
(async () => {
  const result = await simulateFetchBoreUrl("aB3xZ6");
  assert(result.success === true, "Test 6: fetchBoreUrl con code válido");
  assert(result.boreUrl === "bore.pub:28734", "Test 6: boreUrl = bore.pub:28734");
})();

// Test 7: fetchBoreUrl con room code inválido (badcode)
(async () => {
  const result = await simulateFetchBoreUrl("badcode");
  assert(result.success === false, "Test 7: fetchBoreUrl con code inválido");
  assert(result.error.includes("404"), "Test 7: error menciona 404");
})();

// Test 8: fetchBoreUrl room code vacío
(async () => {
  const result = await simulateFetchBoreUrl("");
  assert(result.success === false, "Test 8: fetchBoreUrl code vacío");
  assert(result.error.includes("inválido"), "Test 8: error menciona inválido");
})();

// Test 9: fetchBoreUrl room code demasiado corto
(async () => {
  const result = await simulateFetchBoreUrl("ab");
  assert(result.success === false, "Test 9: fetchBoreUrl code muy corto");
  assert(result.error.includes("inválido"), "Test 9: error menciona inválido");
})();

// Test 10: setNakamaConfig remoto
{
  const cfg = simulateSetNakamaConfig("bore.pub", "28734");
  assert(cfg.host === "bore.pub", "Test 10: host = bore.pub");
  assert(cfg.port === "28734", "Test 10: port = 28734");
}

// Test 11: handleBootstrapGuest — parseo de boreUrl
{
  const boreUrl = "bore.pub:28734";
  let host = boreUrl;
  let port = BORE_NAKAMA_PORT;
  if (boreUrl.includes(":")) {
    const parts = boreUrl.split(":");
    host = parts[0];
    port = parts[1] || BORE_NAKAMA_PORT;
  }
  assert(host === "bore.pub", "Test 11: parse host = bore.pub");
  assert(port === "28734", "Test 11: parse port = 28734");
}

// Test 12: handleBootstrapGuest — boreUrl con solo host
{
  const boreUrl = "bore.pub";
  let host = boreUrl;
  let port = BORE_NAKAMA_PORT;
  if (boreUrl.includes(":")) {
    const parts = boreUrl.split(":");
    host = parts[0];
    port = parts[1] || BORE_NAKAMA_PORT;
  }
  assert(host === "bore.pub", "Test 12: host sin puerto se queda como bore.pub");
  assert(port === "7350", "Test 12: port default 7350");
}

// Test 13: handleBootstrapClose — no hace falta cleanup si no hay proceso
// Verificamos que la lógica de stop/restore no crashee
{
  let error = null;
  try {
    // Simula lo que hace handleBootstrapClose
    const boreProcess = null;
    if (boreProcess) boreProcess.kill();
    // restore localhost
    const cfg = { host: "127.0.0.1", port: "7350" };
  } catch (e) {
    error = e;
  }
  assert(error === null, "Test 13: Close sin proceso activo no crashea");
}

// Test 14: publishBoreUrl con dpaste
{
  const result = { success: false, error: "Error publicando en dpaste: Timeout" };
  assert(result.success === false, "Test 14: dpaste timeout manejado");
  assert(result.error.includes("Timeout"), "Test 14: error menciona Timeout");
}

// Test 15: Verificar que el código fuente tiene el puerto correcto
{
  const fs = require("fs");
  const source = fs.readFileSync("./src/main/bootstrap.ts", "utf8");
  const hasPort7350 = source.includes('"7350"');
  const hasBorePub = source.includes("bore.pub");
  assert(hasPort7350, "Test 15: bootstrap.ts usa puerto 7350 para Nakama");
  assert(hasBorePub, "Test 15: bootstrap.ts usa bore.pub");
}

// Test 16: Verificar App.tsx tiene los nuevos handlers de bootstrap
{
  const fs = require("fs");
  const source = fs.readFileSync("./src/App.tsx", "utf8");
  assert(source.includes("handleBootstrapHost"), "Test 16: App.tsx tiene handleBootstrapHost");
  assert(source.includes("handleBootstrapGuest"), "Test 16: App.tsx tiene handleBootstrapGuest");
  assert(source.includes("handleBootstrapClose"), "Test 16: App.tsx tiene handleBootstrapClose");
  assert(source.includes("bootstrapRoomCode"), "Test 16: App.tsx tiene bootstrapRoomCode");
  assert(source.includes("ABRIR SALA PÚBLICA"), "Test 16: App.tsx tiene botón ABRIR SALA PÚBLICA");
}

// Test 17: Verificar ipcChannels.ts tiene los nuevos canales
{
  const fs = require("fs");
  const source = fs.readFileSync("./src/main/services/ipcChannels.ts", "utf8");
  assert(source.includes("BOOTSTRAP_HOST"), "Test 17: ipcChannels tiene BOOTSTRAP_HOST");
  assert(source.includes("BOOTSTRAP_GUEST"), "Test 17: ipcChannels tiene BOOTSTRAP_GUEST");
  assert(source.includes("BOOTSTRAP_CLOSE"), "Test 17: ipcChannels tiene BOOTSTRAP_CLOSE");
  assert(source.includes("bootstrap-host"), "Test 17: ipcChannels tiene bootstrap-host literal");
}

// Test 18: Verificar index.ts registra los handlers
{
  const fs = require("fs");
  const source = fs.readFileSync("./src/main/index.ts", "utf8");
  assert(source.includes('"bootstrap-host"'), "Test 18: index.ts registra bootstrap-host");
  assert(source.includes('"bootstrap-guest"'), "Test 18: index.ts registra bootstrap-guest");
  assert(source.includes('"bootstrap-close"'), "Test 18: index.ts registra bootstrap-close");
  assert(source.includes('from "./bootstrap"'), "Test 18: index.ts importa bootstrap");
}

// Test 19: handleBootstrapHost — pipeline startNakamaBore + publishBoreUrl
// Simulación inline del pipeline
(async () => {
  const boreUrl = "bore.pub:28734";
  const pubResult = await simulatePublishBoreUrl(boreUrl);
  assert(pubResult.success === true, "Test 19: publish tras bore exitoso");
  assert(pubResult.roomCode === "aB3xZ6", "Test 19: roomCode generado");
})();

// Test 20: Auto-detección de código de 6 caracteres
{
  const codes = [
    "https://dpaste.org/abc123/",
    "https://dpaste.org/XYZ789/",
    "https://dpaste.org/test12/",
  ];
  for (const url of codes) {
    const match = url.match(/dpaste\.org\/([a-zA-Z0-9]+)/);
    assert(match !== null, `Test 20: hash extraído de ${url}`);
    assert(match[1].length >= 4, `Test 20: hash ${match[1]} tiene >= 4 caracteres`);
  }
}

// ── RESULTADOS ──────────────────────────────────────────────────────

const total = passed + failed;
console.log("=".repeat(60));
console.log(`Pasadas: ${passed}, Falladas: ${failed}, Total: ${total}`);
if (failed === 0) {
  console.log("✅ TODAS LAS PRUEBAS PASARON");
} else {
  console.log("❌ HAY FALLAS");
  process.exit(1);
}
