import dgram from "dgram";
import net from "net";

const HOST_LISTEN_PORT = 15535;
const GUEST_LISTEN_PORT = 15536;
let passed = 0, failed = 0;

function assert(c, m) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.log(`  ❌ ${m}`); } }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test() {
  console.log("\n=== Pipeline TCP↔UDP bridge (bootstrap relay) ===\n");

  // Host listener (simula GGPO host :6003)
  const hostListener = dgram.createSocket("udp4");
  let hostReceived = [];
  await new Promise(r => hostListener.bind(HOST_LISTEN_PORT, "127.0.0.1", r));
  hostListener.on("message", (msg) => { hostReceived.push(msg.toString()); });
  console.log(`  [SETUP] Host listen :${HOST_LISTEN_PORT} (simula :6003)`);

  // Guest listener (simula GGPO guest :6004)
  const guestListener = dgram.createSocket("udp4");
  let guestReceived = [];
  await new Promise(r => guestListener.bind(GUEST_LISTEN_PORT, "127.0.0.1", r));
  guestListener.on("message", (msg) => { guestReceived.push(msg.toString()); });
  console.log(`  [SETUP] Guest listen :${GUEST_LISTEN_PORT} (simula :6004)`);

  // ── HOST SIDE ──
  const udpRelay = dgram.createSocket("udp4");
  const relayPort = await new Promise(r => udpRelay.bind(0, "127.0.0.1", () => r(udpRelay.address().port)));

  const tcpClients = new Set();
  const tcpServer = net.createServer(s => {
    s.setNoDelay(true); tcpClients.add(s);
    s.on("data", d => { const t = dgram.createSocket("udp4"); t.send(d, HOST_LISTEN_PORT, "127.0.0.1", () => { try { t.close(); } catch {} }); });
    s.on("close", () => tcpClients.delete(s)); s.on("error", () => tcpClients.delete(s));
  });
  const tcpPort = await new Promise(r => tcpServer.listen(0, "127.0.0.1", () => r(tcpServer.address().port)));
  udpRelay.on("message", msg => { for (const c of tcpClients) if (c.writable) c.write(msg); });
  console.log(`  [HOST] relay :${relayPort} | TCP :${tcpPort}`);

  // ── GUEST SIDE ──
  const tcpSocket = new net.Socket(); tcpSocket.setNoDelay(true);
  await new Promise((res, rej) => { tcpSocket.connect(tcpPort, "127.0.0.1", res); tcpSocket.once("error", rej); });
  tcpSocket.on("data", d => { const t = dgram.createSocket("udp4"); t.send(d, GUEST_LISTEN_PORT, "127.0.0.1", () => { try { t.close(); } catch {} }); });

  const udpForwarder = dgram.createSocket("udp4");
  let fwdReceived = [];
  udpForwarder.on("message", msg => {
    fwdReceived.push(msg.toString());
    if (tcpSocket.writable) tcpSocket.write(msg);
  });
  const fwdPort = await new Promise(r => udpForwarder.bind(0, "127.0.0.1", () => r(udpForwarder.address().port)));
  console.log(`  [GUEST] TCP :${tcpPort} | fwd :${fwdPort}\n`);

  const g = dgram.createSocket("udp4"); await new Promise(r => g.bind(0, r));
  const h = dgram.createSocket("udp4"); await new Promise(r => h.bind(0, r));

  await sleep(200);

  // TEST 1: Guest→Host
  g.send(Buffer.from("INPUTS"), fwdPort, "127.0.0.1");
  await sleep(500);
  assert(hostReceived.length >= 1, `Guest→Host: "${hostReceived[0] || ''}"`);

  // TEST 2: Host→Guest
  h.send(Buffer.from("STATE"), relayPort, "127.0.0.1");
  await sleep(500);
  assert(guestReceived.length >= 1, `Host→Guest: "${guestReceived[0] || ''}"`);

  // TEST 3: Bidireccional simultáneo
  const hB = hostReceived.length, gB = guestReceived.length;
  g.send(Buffer.from("P1"), fwdPort, "127.0.0.1");
  h.send(Buffer.from("P2"), relayPort, "127.0.0.1");
  await sleep(500);
  assert(hostReceived.length >= hB + 1, `Bidi host +${hostReceived.length - hB}`);
  assert(guestReceived.length >= gB + 1, `Bidi guest +${guestReceived.length - gB}`);

  // TEST 4: Sin loop (data no rebota)
  const fB = fwdReceived.length;
  g.send(Buffer.from("NO_LOOP"), fwdPort, "127.0.0.1");
  await sleep(500);
  // forwarder recibe 1 (el original). El host listener solo cuenta, no reenvía.
  assert(fwdReceived.length === fB + 1, `Sin loop: fwd +${fwdReceived.length - fB} (esperado 1)`);

  // CLEANUP
  g.close(); h.close();
  udpForwarder.close(); tcpSocket.destroy();
  udpRelay.close(); tcpServer.close();
  hostListener.close(); guestListener.close();

  console.log(`\n═══ RESULTADOS ═══`);
  console.log(`Pasadas: ${passed}, Falladas: ${failed}, Total: ${passed + failed}`);
  if (failed === 0) console.log("✅ PIPELINE TCP↔UDP FUNCIONA CORRECTAMENTE");
  else console.log(`❌ ${failed} fallaron`);
  process.exit(failed > 0 ? 1 : 0);
}
test().catch(e => { console.error("Error:", e); process.exit(1); });
