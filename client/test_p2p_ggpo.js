/**
 * Test desechable: validación del flujo P2P+GGPO
 * 
 * Simula el intercambio de mensajes entre Host y Guest
 * para P2P + GGPO sin Electron ni Nakama real.
 * 
 * Uso: node test_p2p_ggpo.js
 */

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) {
    console.log(`  ✅ ${msg} (${JSON.stringify(actual)})`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}: esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(actual)}`);
    failed++;
  }
}

function simulateLanDetection(hostPrivateIps, guestPrivateIps) {
  // Copia simplificada de anySameSubnet
  function getPrivatePrefix(ip) {
    if (ip.startsWith("10.")) return ip.split(".").slice(0, 2).join(".");
    if (ip.startsWith("172.")) {
      const second = parseInt(ip.split(".")[1], 10);
      if (second >= 16 && second <= 31) return ip.split(".").slice(0, 2).join(".");
    }
    if (ip.startsWith("192.168")) return "192.168";
    if (ip.startsWith("100.")) return null; // Tailscale
    return null;
  }

  function anySameSubnet(hostIps, guestIps) {
    const hostPrefixes = hostIps.map(getPrivatePrefix).filter(Boolean);
    const guestPrefixes = guestIps.map(getPrivatePrefix).filter(Boolean);
    return hostPrefixes.some(hp => guestPrefixes.some(gp => hp === gp));
  }

  return {
    isLan: anySameSubnet(hostPrivateIps, guestPrivateIps),
    hostLanIp: hostPrivateIps.find(ip => !ip.startsWith("100.")) || hostPrivateIps[0],
  };
}

// ==========================
// TEST 1: LAN detection
// ==========================
console.log("\n=== Test 1: LAN detection ===");

// Case 1: Same 192.168.x.x
const r1 = simulateLanDetection(
  ["192.168.1.10"],
  ["192.168.1.20"]
);
assert(r1.isLan === true, "Misma subred 192.168 → LAN detectado");
assertEqual(r1.hostLanIp, "192.168.1.10", "hostLanIp es la IP correcta");

// Case 2: Different subnets
const r2 = simulateLanDetection(
  ["192.168.1.10"],
  ["10.0.0.5"]
);
assert(r2.isLan === false, "Distinta subred → NO LAN");

// Case 3: Tailscale IPs (100.x.x.x) + LAN
const r3 = simulateLanDetection(
  ["100.64.0.1", "192.168.1.10"],
  ["100.64.0.2", "192.168.1.20"]
);
assert(r3.isLan === true, "Tailscale + misma LAN → LAN detectado");
assertEqual(r3.hostLanIp, "192.168.1.10", "hostLanIp excluye Tailscale");

// Case 4: Only Tailscale IPs
const r4 = simulateLanDetection(
  ["100.64.0.1"],
  ["100.64.0.2"]
);
assert(r4.isLan === false, "Solo Tailscale → NO LAN");
assertEqual(r4.hostLanIp, "100.64.0.1", "hostLanIp fallback a Tailscale si no hay otra");

// ==========================
// TEST 2: Guest ACCEPT message
// ==========================
console.log("\n=== Test 2: Guest ACCEPT message ===");

function simulateGuestAccept(userId, username, guestOwnIp, engine) {
  const message = {
    _type: "challenge_accept",
    targetId: "host123",
    acceptedBy: userId,
    acceptedByName: username,
  };

  if (engine === "ggpo") {
    message.guestIp = guestOwnIp;
  }

  return message;
}

const guestMsg = simulateGuestAccept("guest456", "Player2", "192.168.1.20", "ggpo");
assertEqual(guestMsg.guestIp, "192.168.1.20", "ACCEPT message incluye guestIp para GGPO");
assertEqual(guestMsg._type, "challenge_accept", "Tipo de mensaje correcto");
assertEqual(guestMsg.acceptedBy, "guest456", "acceptedBy presente");

// Sin GGPO → no incluye guestIp
const guestMsgNoGgpo = simulateGuestAccept("guest456", "Player2", "192.168.1.20", "retroarch");
assertEqual(guestMsgNoGgpo.guestIp, undefined, "Sin GGPO → guestIp NO incluido");

// ==========================
// TEST 3: Host sendConnectionInfo
// ==========================
console.log("\n=== Test 3: Host sendConnectionInfo ===");

function simulateHostSendConnectionInfo(hostOwnIp, hostName, engine) {
  if (engine !== "ggpo") return null;
  return {
    _type: "challenge_accept_conn",
    targetId: "guest456",
    ggpoHostIp: hostOwnIp,
    hostName: hostName,
    useGgpo: true,
  };
}

const connInfo = simulateHostSendConnectionInfo("192.168.1.10", "Player1", "ggpo");
assert(connInfo !== null, "connection_info no es null para GGPO");
assertEqual(connInfo.ggpoHostIp, "192.168.1.10", "ggpoHostIp correcto");
assertEqual(connInfo.useGgpo, true, "useGgpo flag presente");
assertEqual(connInfo.hostName, "Player1", "hostName presente");

const connInfoNoGgpo = simulateHostSendConnectionInfo("192.168.1.10", "Player1", "retroarch");
assertEqual(connInfoNoGgpo, null, "Sin GGPO → connection_info no se envía");

// ==========================
// TEST 4: Guest handles connection_info
// ==========================
console.log("\n=== Test 4: Guest handles connection_info ===");

function simulateGuestHandleConnectionInfo(content, currentChallenge, sendToLobbyCalls) {
  const method = currentChallenge?.method || "bore";

  if (content.useGgpo) {
    const hostIp = content.ggpoHostIp;
    if (!hostIp) return { error: "No host IP", action: null };

    // Simular ggpo-launch
    const ggpoLaunchArgs = {
      rom: "kof98",
      localPort: 6004,
      remoteIp: hostIp,
      remotePort: 6003,
      playerNumber: 1,
    };

    // Simular sendToLobby guest_ready
    sendToLobbyCalls.push({
      type: "challenge_guest_ready",
      payload: { _type: "challenge_guest_ready", targetId: content.senderId, guestIp: "192.168.1.20" },
    });

    return { error: null, action: "ggpo-launch", args: ggpoLaunchArgs };
  }

  return { error: null, action: "other" };
}

const sendToLobbyCalls = [];
const result = simulateGuestHandleConnectionInfo(
  { _type: "challenge_accept_conn", senderId: "host123", ggpoHostIp: "192.168.1.10", useGgpo: true },
  { method: "p2p" },
  sendToLobbyCalls,
);

assertEqual(result.error, null, "No error handling connection_info");
assertEqual(result.action, "ggpo-launch", "Guest lanza ggpo-launch");
assertEqual(result.args.remoteIp, "192.168.1.10", "remoteIp = hostIp");
assertEqual(result.args.playerNumber, 1, "Guest es player 1");
assertEqual(sendToLobbyCalls.length, 1, "Guest envía guest_ready");
assertEqual(sendToLobbyCalls[0].type, "challenge_guest_ready", "Tipo guest_ready");
assertEqual(sendToLobbyCalls[0].payload.guestIp, "192.168.1.20", "guestIp en guest_ready");

// ==========================
// TEST 5: Host handles guest_ready
// ==========================
console.log("\n=== Test 5: Host handles guest_ready ===");

function simulateHostHandleGuestReady(content, engine) {
  if (content._type === "challenge_guest_ready" && engine === "ggpo") {
    const guestIp = content.guestIp;
    if (!guestIp) return { error: "No guest IP", action: null };

    return {
      error: null,
      action: "ggpo-launch",
      args: {
        rom: "kof98",
        localPort: 6003,
        remoteIp: guestIp,
        remotePort: 6004,
        playerNumber: 0,
      },
    };
  }
  return { error: null, action: null };
}

const hostResult = simulateHostHandleGuestReady(
  { _type: "challenge_guest_ready", guestIp: "192.168.1.20" },
  "ggpo",
);
assertEqual(hostResult.error, null, "Host maneja guest_ready sin error");
assertEqual(hostResult.action, "ggpo-launch", "Host lanza ggpo-launch");
assertEqual(hostResult.args.remoteIp, "192.168.1.20", "remoteIp = guestIp");
assertEqual(hostResult.args.playerNumber, 0, "Host es player 0");

// Sin GGPO → no launch
const hostResultNoGgpo = simulateHostHandleGuestReady(
  { _type: "challenge_guest_ready", guestIp: "192.168.1.20" },
  "retroarch",
);
assertEqual(hostResultNoGgpo.action, null, "Sin GGPO → host no lanza ggpo");

// ==========================
// TEST 6: Flujo completo simulado
// ==========================
console.log("\n=== Test 6: Full GGPO+P2P flow simulation ===");

const hostIps = ["192.168.1.10"];
const guestIps = ["192.168.1.20"];

// Step 1: Host inicia P2P (simulado: solo detecta LAN)
const hostLanResult = simulateLanDetection(hostIps, guestIps);

// Step 2: Guest acepta, detecta LAN
const guestLanResult = simulateLanDetection(hostIps, guestIps);

assert(hostLanResult.isLan === true, "Step 1: Host en LAN");
assert(guestLanResult.isLan === true, "Step 2: Guest detecta LAN");

// Step 3: Guest envía ACCEPT con guestIp
const fullGuestMsg = simulateGuestAccept("guest456", "Player2", guestIps[0], "ggpo");
assertEqual(fullGuestMsg.guestIp, "192.168.1.20", "Step 3: Guest ACCEPT incluye IP");

// Step 4: Host recibe ACCEPT, envía connection_info
const fullConnInfo = simulateHostSendConnectionInfo(hostIps[0], "Player1", "ggpo");
assertEqual(fullConnInfo.ggpoHostIp, "192.168.1.10", "Step 4: connection_info con host IP");

// Step 5: Guest recibe connection_info, lanza GGPO
const guestConnCalls = [];
const fullGuestConn = simulateGuestHandleConnectionInfo(
  { _type: "challenge_accept_conn", senderId: "host123", ...fullConnInfo },
  { method: "p2p" },
  guestConnCalls,
);
assertEqual(fullGuestConn.action, "ggpo-launch", "Step 5: Guest lanza GGPO");
assertEqual(fullGuestConn.args.remoteIp, "192.168.1.10", "Step 5: Guest conecta a host IP");

// Step 6: Host recibe guest_ready, lanza GGPO
const fullHostReady = simulateHostHandleGuestReady(
  guestConnCalls[0].payload,
  "ggpo",
);
assertEqual(fullHostReady.action, "ggpo-launch", "Step 6: Host lanza GGPO");
assertEqual(fullHostReady.args.remoteIp, "192.168.1.20", "Step 6: Host conecta a guest IP");

// ==========================
// TEST 7: Regresión — P2P+RetroArch sigue funcionando
// ==========================
console.log("\n=== Test 7: Regression — P2P+RetroArch ===");

// Simular que el flujo RetroArch no se ve afectado por GGPO
// Guest accept sin GGPO → no guestIp en ACCEPT
const raGuestMsg = simulateGuestAccept("guest456", "Player2", "192.168.1.20", "retroarch");
assertEqual(raGuestMsg.guestIp, undefined, "RetroArch ACCEPT no incluye guestIp");

// Host sin GGPO → no connection_info
const raConnInfo = simulateHostSendConnectionInfo("192.168.1.10", "Player1", "retroarch");
assertEqual(raConnInfo, null, "RetroArch: host no envía connection_info");

// Guest_ready sin GGPO → no launch
const raReady = simulateHostHandleGuestReady(
  { _type: "challenge_guest_ready", guestIp: "192.168.1.20" },
  "retroarch",
);
assertEqual(raReady.action, null, "RetroArch: guest_ready no lanza GGPO");

// ==========================
// SUMMARY
// ==========================
console.log(`\n=== RESULTADOS ===`);
console.log(`Pruebas pasadas: ${passed}`);
console.log(`Pruebas falladas: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log(`Éxito: ${Math.round(passed / (passed + failed) * 100)}%`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ TODAS LAS PRUEBAS PASARON");
}
