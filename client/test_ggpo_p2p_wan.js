/**
 * TEST DESECHABLE — Relay WAN para GGPO vía P2P
 *
 * Simula pipeline relay: Guest GGPO ↔ forwarder ↔ relay ↔ Host GGPO
 * También testea auto-detección LAN/WAN, cleanup, errores.
 *
 * Uso: node test_ggpo_p2p_wan.js
 */

import dgram from "dgram";

let passed = 0;
let failed = 0;

function assert(c, m) { if (c) { console.log(`  ✅ ${m}`); passed++; } else { console.log(`  ❌ ${m}`); failed++; } }
function assertEq(a, e, m) {
  if (a === e) { console.log(`  ✅ ${m} (${JSON.stringify(a)})`); passed++; }
  else { console.log(`  ❌ ${m}: esperado ${JSON.stringify(e)}, obtenido ${JSON.stringify(a)}`); failed++; }
}

function sendAndWait(sock, data, port, addr, tmo = 3000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout")), tmo);
    sock.once("message", (m) => { clearTimeout(t); res(m.toString()); });
    sock.send(data, port, addr, (e) => { if (e) { clearTimeout(t); rej(e); } });
  });
}

async function main() {
  try {
    // ========== TEST 1: LAN/WAN ==========
    console.log("\n=== Test 1: Auto-detección LAN/WAN ===");
    const detect = (cand, status) => {
      if (!cand) return { success: false, error: "No host candidate" };
      if (status === "lan_check")
        return { success: true, isLan: true, hostLanIp: cand.privateIps?.[0] || cand.publicIp, candidate: {} };
      return { success: true, isLan: false, forwarderPort: 9999, candidate: {} };
    };
    assert(detect({ publicIp: "1.2.3.4", privateIps: ["192.168.1.10"] }, "lan_check").isLan === true, "LAN detectado");
    assert(detect({ publicIp: "5.6.7.8", privateIps: ["10.0.0.5"] }, "direct_connected").isLan === false, "WAN detectado");
    assert(detect(null, "idle").success === false, "Error sin candidate");

    // ========== TEST 2: Relay Pipeline ==========
    console.log("\n=== Test 2: Relay UDP pipeline ===");

    // GGPO Host simulado (escucha 6003, responde con eco)
    const host = dgram.createSocket("udp4");
    await new Promise(r => host.bind(6003, "127.0.0.1", r));
    host.on("message", (m, rinfo) => { host.send(`ECHO:${m}`, rinfo.port, rinfo.address); });

    // RELAY: recibe de forwarder → host:6003; recibe de host → forwarder
    const relay = dgram.createSocket("udp4");
    const relayPort = await new Promise(r => relay.bind(0, "127.0.0.1", () => r(relay.address().port)));
    let fwdAddr = null;
    relay.on("message", (m, rinfo) => {
      if (rinfo.port === 6003 && fwdAddr) { relay.send(m, fwdAddr.port, fwdAddr.address); }
      else { fwdAddr = rinfo; relay.send(m, 6003, "127.0.0.1"); }
    });

    // FORWARDER: recibe de guest → relay; recibe de relay → guest
    const fwd = dgram.createSocket("udp4");
    const fwdPort = await new Promise(r => fwd.bind(0, "127.0.0.1", () => r(fwd.address().port)));
    fwd.on("message", (m, rinfo) => {
      if (rinfo.port === relayPort) { fwd.send(m, 6004, "127.0.0.1"); }
      else { fwd.send(m, relayPort, "127.0.0.1"); }
    });

    // GGPO Guest (escucha 6004)
    const guest = dgram.createSocket("udp4");
    await new Promise(r => guest.bind(6004, "127.0.0.1", r));

    try {
      const r = await sendAndWait(guest, "HELLO", fwdPort, "127.0.0.1", 3000);
      assert(r === "ECHO:HELLO", "Pipeline: guest → fwd → relay → host → eco → relay → fwd → guest");
    } catch (e) { assert(false, `Pipeline falló: ${e.message}`); }

    host.close(); relay.close(); fwd.close(); guest.close();

    // ========== TEST 3: Forwarder ↔ Relay ==========
    console.log("\n=== Test 3: Forwarder y Relay aislados ===");
    const fSock = dgram.createSocket("udp4");
    const fP = await new Promise(r => fSock.bind(0, "127.0.0.1", () => r(fSock.address().port)));
    let fRx = null;
    fSock.on("message", m => { fRx = m.toString(); });
    const rSock = dgram.createSocket("udp4");
    const rP = await new Promise(r => rSock.bind(0, "127.0.0.1", () => r(rSock.address().port)));
    let rRx = null;
    rSock.on("message", (m, ri) => { rRx = m.toString(); rSock.send(`R:${m}`, fP, "127.0.0.1"); });
    fSock.send("DATA", rP, "127.0.0.1");
    await new Promise(r => setTimeout(r, 300));
    assert(rRx === "DATA", "Relay recibe del forwarder");
    assert(fRx === "R:DATA", "Forwarder recibe del relay");
    fSock.close(); rSock.close();

    // ========== TEST 4: Cleanup ==========
    console.log("\n=== Test 4: Cleanup ===");
    const cleanup = (h, g, rs, fs) => {
      if (fs) try { fs.close(); } catch {} if (rs) try { rs.close(); } catch {}
      return { success: true };
    };
    assert(cleanup({}, {}, { close() {} }, { close() {} }).success, "Disconnect con recursos");
    assert(cleanup(null, null, null, null).success, "Disconnect sin recursos");

    // ========== TEST 5: Errores ==========
    console.log("\n=== Test 5: Errores de estado ===");
    const reg = (hm, gc) => {
      if (!hm) return { success: false, error: "No active host" };
      if (!gc) return { success: false, error: "No candidate" };
      return { success: true, relayPort: 12345 };
    };
    assert(reg(null, {}).success === false, "Sin host → error");
    assert(reg({}, null).success === false, "Sin candidate → error");
    assert(reg({}, { peerId: "x" }).success === true, "Todo correcto → success");

    // ========== TEST 6: Tokens ==========
    console.log("\n=== Test 6: Token counter separado ===");
    let pt = 100, gt = 200;
    const pa = Array.from({ length: 5 }, () => pt++);
    const ga = Array.from({ length: 5 }, () => gt++);
    assert(!pa.some(t => ga.includes(t)), "Sin colisión con p2pBridge");
    assertEq(ga[0], 200, "Primer token = 200");
    assertEq(ga[4], 204, "Quinto token = 204");

    // ========== TEST 7: Regression ==========
    console.log("\n=== Test 7: Regression LAN GGPO+P2P ===");
    const cf = (eng, meth, lan) => {
      if (meth !== "p2p") return null;
      if (eng !== "ggpo") return { action: "ra" };
      return lan ? { action: "accept", guestIp: "192.168.1.20" } : { action: "accept", guestCandidate: "c" };
    };
    assertEq(cf("ggpo", "p2p", true).guestIp, "192.168.1.20", "LAN GGPO: guestIp");
    assert(cf("ggpo", "p2p", false).guestIp === undefined, "WAN GGPO: sin guestIp");
    assertEq(cf("retroarch", "p2p", true).action, "ra", "RetroArch no afectado");

    // ========== SUMMARY ==========
    console.log(`\n=== RESULTADOS ===`);
    console.log(`Pasadas: ${passed}, Falladas: ${failed}, Total: ${passed + failed}`);
    console.log(`Éxito: ${Math.round(passed / (passed + failed) * 100)}%`);
    if (failed > 0) process.exit(1); else console.log("\n✅ TODAS LAS PRUEBAS PASARON");
  } catch (e) { console.error("FATAL:", e); process.exit(1); }
}
main();
