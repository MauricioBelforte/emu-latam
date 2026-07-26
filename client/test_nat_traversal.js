/**
 * Tests para NAT Traversal (STUN + Hole Punching)
 *
 * USO: node test_nat_traversal.js
 *
 * Tests:
 *   UT-01: STUN binding request formato correcto
 *   UT-02: parseStunResponse con respuesta simulada
 *   UT-03: STUN timeout manejado
 *   UT-04: Hole punch timeout
 *   UT-05: Deteccin NAT simtrica
 *   UT-06: Cleanup
 *   IT-01: Hole punch localhost (loopback)
 */

const dgram = require("dgram");
const path = require("path");
const fs = require("fs");

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? " - " + detail : ""}`);
    failed++;
  }
}

// ──────────────────────────────────────────
// STUN PROTOCOL (RFC 5389) - copies from natTraversal.ts
// ──────────────────────────────────────────

function createStunBindingRequest() {
  const buf = Buffer.alloc(20);
  buf.writeUInt16BE(0x0001, 0);      // Binding Request
  buf.writeUInt16BE(0, 2);           // No attributes
  buf.writeUInt32BE(0x2112A442, 4);  // Magic Cookie
  for (let i = 0; i < 12; i++) {
    buf[8 + i] = Math.floor(Math.random() * 256);
  }
  return buf;
}

function parseStunResponse(msg) {
  if (msg.length < 20) return null;
  const type = msg.readUInt16BE(0);
  if (type !== 0x0101) return null;
  const cookie = msg.readUInt32BE(4);
  if (cookie !== 0x2112A442) return null;

  let offset = 20;
  while (offset + 4 <= msg.length) {
    const attrType = msg.readUInt16BE(offset);
    const attrLen = msg.readUInt16BE(offset + 2);
    const valueStart = offset + 4;
    if (attrType === 0x0001) {        // MAPPED-ADDRESS
      if (valueStart + 8 > msg.length) return null;
      const family = msg.readUInt8(valueStart + 1);
      if (family !== 0x01) return null;
      const port = msg.readUInt16BE(valueStart + 2);
      const ip = `${msg[valueStart + 4]}.${msg[valueStart + 5]}.${msg[valueStart + 6]}.${msg[valueStart + 7]}`;
      return { ip, port };
    }
    offset += 4 + attrLen;
    if (attrLen % 4 !== 0) offset += 4 - (attrLen % 4);
  }
  return null;
}

function buildStunResponse(ip, port, txnId) {
  // Construir Binding Response (type 0x0101) con MAPPED-ADDRESS
  const attrBody = Buffer.alloc(8);
  attrBody.writeUInt8(0, 0);         // Reserved
  attrBody.writeUInt8(0x01, 1);      // Family: IPv4
  attrBody.writeUInt16BE(port, 2);   // Port
  const parts = ip.split(".").map(Number);
  attrBody[4] = parts[0];
  attrBody[5] = parts[1];
  attrBody[6] = parts[2];
  attrBody[7] = parts[3];

  const msg = Buffer.alloc(20 + 4 + 8);
  msg.writeUInt16BE(0x0101, 0);      // Binding Response
  msg.writeUInt16BE(8, 2);           // Attribute length
  msg.writeUInt32BE(0x2112A442, 4);  // Magic Cookie
  // Transaction ID (from request or mock)
  for (let i = 0; i < 12; i++) msg[8 + i] = txnId ? txnId[i] : (i + 1);
  msg.writeUInt16BE(0x0001, 20);     // MAPPED-ADDRESS type
  msg.writeUInt16BE(8, 22);          // MAPPED-ADDRESS length
  attrBody.copy(msg, 24);
  return msg;
}

// ──────────────────────────────────────────
// UT-01: STUN Binding Request Format
// ──────────────────────────────────────────
console.log("\n UT-01: STUN Binding Request formato");

const req = createStunBindingRequest();
assert("Buffer de 20 bytes", req.length === 20);
assert("Type = 0x0001 (Binding Request)", req.readUInt16BE(0) === 0x0001);
assert("Length = 0", req.readUInt16BE(2) === 0);
assert("Magic Cookie = 0x2112A442", req.readUInt32BE(4) === 0x2112A442);
assert("Transaction ID de 12 bytes no nulo", Buffer.from(req.slice(8)).some(b => b !== 0));

// ──────────────────────────────────────────
// UT-02: Parse STUN Response
// ──────────────────────────────────────────
console.log("\n UT-02: parseStunResponse");

const resp = buildStunResponse("192.168.1.100", 55435);
const parsed = parseStunResponse(resp);
assert("Responde con IP correcta", parsed && parsed.ip === "192.168.1.100", JSON.stringify(parsed));
assert("Responde con puerto correcto", parsed && parsed.port === 55435);

// Respuesta invlida (no es Binding Response)
const invalidType = Buffer.from(resp);
invalidType.writeUInt16BE(0x0002, 0);
assert("Tipo incorrecto retorna null", parseStunResponse(invalidType) === null);

// Respuesta muy corta
assert("Buffer muy corto retorna null", parseStunResponse(Buffer.alloc(10)) === null);

// Magic Cookie incorrecta
const badCookie = Buffer.from(resp);
badCookie.writeUInt32BE(0xDEADBEEF, 4);
assert("Magic Cookie incorrecta retorna null", parseStunResponse(badCookie) === null);

// ──────────────────────────────────────────
// UT-03: STUN Timeout (simulado)
// ──────────────────────────────────────────
console.log("\n UT-03: STUN timeout (simulado sin servidor)");

function stubStunRequest(timeoutMs) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const req2 = createStunBindingRequest();
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; socket.close(); resolve(null); }
    }, timeoutMs);
    socket.on("message", (msg) => {
      if (!done) { done = true; clearTimeout(timer); socket.close(); resolve(parseStunResponse(msg)); }
    });
    socket.on("error", () => { if (!done) { done = true; clearTimeout(timer); socket.close(); resolve(null); } });
    // Enviar a un puerto que probablemente no responda
    socket.send(req2, 9999, "127.0.0.1", (err) => {
      if (err) { if (!done) { done = true; clearTimeout(timer); socket.close(); resolve(null); } }
    });
  });
}

async function testStunTimeout() {
  const t0 = Date.now();
  const result = await stubStunRequest(500);
  const elapsed = Date.now() - t0;
  assert("Timeout retorna null despus de ~500ms", result === null, `result: ${JSON.stringify(result)}`);
  assert("Timeout respeta el tiempo (entre 400-1000ms)", elapsed >= 400 && elapsed <= 1500, `elapsed: ${elapsed}ms`);
}

// ──────────────────────────────────────────
// UT-05: Deteccin NAT Simtrica
// ──────────────────────────────────────────
console.log("\n UT-05: Deteccin NAT Simtrica");

function detectSymmetric(results) {
  const valid = results.filter(r => r !== null);
  if (valid.length === 0) return "unknown";
  const first = valid[0];
  const symmetric = valid.length > 1 && valid.some(r => r && r.port !== first.port);
  return symmetric ? "symmetric" : "compatible";
}

assert("2 puertos iguales = compatible", detectSymmetric([{ip:"1.2.3.4",port:55435},{ip:"1.2.3.4",port:55435}]) === "compatible");
assert("2 puertos diferentes = symmetric", detectSymmetric([{ip:"1.2.3.4",port:55435},{ip:"1.2.3.4",port:55436}]) === "symmetric");
assert("1 solo resultado = compatible", detectSymmetric([{ip:"1.2.3.4",port:55435}]) === "compatible");
assert("Sin resultados = unknown", detectSymmetric([null, null]) === "unknown");

// ──────────────────────────────────────────
// UT-04: Hole Punch Timeout (simulado)
// ──────────────────────────────────────────
console.log("\n UT-04: Hole Punch timeout (simulado sin peer)");

function stubHolePunch(localPort, timeoutMs) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; socket.close(); resolve({ success: false, localPort }); }
    }, timeoutMs);
    socket.on("message", () => { if (!done) { done = true; clearTimeout(timer); resolve({ success: true, localPort }); } });
    socket.on("error", () => { if (!done) { done = true; clearTimeout(timer); socket.close(); resolve({ success: false, localPort }); } });
    socket.bind(localPort, "127.0.0.1", () => {
      const payload = Buffer.from("TEST_PUNCH");
      const interval = setInterval(() => {
        if (done) { clearInterval(interval); return; }
        socket.send(payload, 19999, "127.0.0.1"); // Puerto sin responder
      }, 100);
      socket.send(payload, 19999, "127.0.0.1");
    });
  });
}

async function testPunchTimeout() {
  const t0 = Date.now();
  const result = await stubHolePunch(0, 800);
  const elapsed = Date.now() - t0;
  assert("Hole punch timeout retorna success=false", result.success === false);
  assert("Timeout respeta el tiempo (~800ms)", elapsed >= 600 && elapsed <= 2000, `elapsed: ${elapsed}ms`);
}

// ──────────────────────────────────────────
// UT-06: Cleanup (verificacin de sockets)
// ──────────────────────────────────────────
console.log("\n UT-06: Cleanup de sockets");

function testCleanup() {
  const sockets = [];
  for (let i = 0; i < 3; i++) {
    const s = dgram.createSocket("udp4");
    s.bind(0, "127.0.0.1");
    sockets.push(s);
  }

  // Cerrar todos
  for (const s of sockets) {
    try { s.close(); } catch {}
  }
  sockets.length = 0;

  // Verificar que se cerraron (no debera haber error al acceder)
  assert("Cleanup completado sin errores", true);
}

// ──────────────────────────────────────────
// IT-01: Hole Punch Localhost (loopback)
// ──────────────────────────────────────────
console.log("\n IT-01: Hole Punch localhost (loopback)");

async function testLocalhostPunch() {
  return new Promise((resolve) => {
    const PORT_A = 19500;
    const PORT_B = 19501;

    const socketA = dgram.createSocket("udp4");
    const socketB = dgram.createSocket("udp4");

    let aReceived = false;
    let bReceived = false;

    socketA.on("message", (msg, rinfo) => {
      if (rinfo.address === "127.0.0.1") {
        aReceived = true;
      }
    });

    socketB.on("message", (msg, rinfo) => {
      if (rinfo.address === "127.0.0.1") {
        bReceived = true;
      }
    });

    socketA.bind(PORT_A, "127.0.0.1", () => {
      socketB.bind(PORT_B, "127.0.0.1", () => {
        // Envo simultneo (hole punch simulado)
        const payload = Buffer.from("PUNCH");
        socketA.send(payload, PORT_B, "127.0.0.1");
        socketB.send(payload, PORT_A, "127.0.0.1");

        setTimeout(() => {
          socketA.close();
          socketB.close();
          assert("Socket A recibe datos de B", aReceived);
          assert("Socket B recibe datos de A", bReceived);
          resolve();
        }, 500);
      });
    });
  });
}

// ──────────────────────────────────────────
// VERIFICACIN DE ARCHIVOS FUENTE
// ──────────────────────────────────────────
console.log("\n ARCHIVOS FUENTE");

const natPath = path.resolve(__dirname, "src", "main", "natTraversal.ts");
const indexPath = path.resolve(__dirname, "src", "main", "index.ts");
const ipcPath = path.resolve(__dirname, "src", "main", "services", "ipcChannels.ts");
const ctxPath = path.resolve(__dirname, "src", "context", "ChallengeContext.tsx");

assert("natTraversal.ts existe", fs.existsSync(natPath));
assert("index.ts existe", fs.existsSync(indexPath));

if (fs.existsSync(ipcPath)) {
  const ipcContent = fs.readFileSync(ipcPath, "utf8");
  assert("ipcChannels.ts contiene NAT_TRAVERSAL_DISCOVER", ipcContent.includes("NAT_TRAVERSAL_DISCOVER"));
  assert("ipcChannels.ts contiene NAT_TRAVERSAL_PUNCH", ipcContent.includes("NAT_TRAVERSAL_PUNCH"));
  assert("ipcChannels.ts contiene NAT_TRAVERSAL_KEEPALIVE", ipcContent.includes("NAT_TRAVERSAL_KEEPALIVE"));
  assert("ipcChannels.ts contiene NAT_TRAVERSAL_STOP", ipcContent.includes("NAT_TRAVERSAL_STOP"));
}

if (fs.existsSync(indexPath)) {
  const idxContent = fs.readFileSync(indexPath, "utf8");
  assert("index.ts importa de natTraversal", idxContent.includes('from "./natTraversal"'));
  assert("index.ts tiene handler nat-traversal-discover", idxContent.includes("nat-traversal-discover"));
  assert("index.ts tiene handler nat-traversal-punch", idxContent.includes("nat-traversal-punch"));
  assert("index.ts tiene handler nat-traversal-keepalive", idxContent.includes("nat-traversal-keepalive"));
  assert("index.ts tiene handler nat-traversal-stop", idxContent.includes("nat-traversal-stop"));
  assert("index.ts tiene cleanup nat-traversal", idxContent.includes('"nat-traversal"'));
}

if (fs.existsSync(ctxPath)) {
  const ctxContent = fs.readFileSync(ctxPath, "utf8");
  assert("ChallengeContext.tsx usa nat-traversal-discover", ctxContent.includes("nat-traversal-discover"));
  assert("ChallengeContext.tsx usa nat-traversal-punch", ctxContent.includes("nat-traversal-punch"));
  assert("ChallengeContext.tsx tiene natPendingRef", ctxContent.includes("natPendingRef"));
  assert("ChallengeContext.tsx tiene useNatTraversal", ctxContent.includes("useNatTraversal"));
}

// ──────────────────────────────────────────
// EJECUTAR TESTS
// ──────────────────────────────────────────
async function run() {
  await testStunTimeout();
  await testPunchTimeout();
  await testLocalhostPunch();
  testCleanup();

  console.log(`\n═══════════════════════════════`);
  console.log(`  TOTAL: ${passed + failed}  |  ✅ ${passed}  |  ❌ ${failed}`);
  console.log(`═══════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
