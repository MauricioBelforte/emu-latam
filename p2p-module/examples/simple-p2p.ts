/**
 * Ejemplo standalone del módulo P2P.
 *
 * Uso:
 *   npx tsx examples/simple-p2p.ts
 *
 * Inicia host y guest en loopback, muestra estado y datos intercambiados.
 */

import { P2PManager } from '../src/P2PManager';
import { NatDetector } from '../src/NatDetector';

async function main() {
  console.log('=== P2P Module Standalone Example ===\n');

  const host = new P2PManager({
    sessionToken: 42,
    callbacks: {
      onStatus: (s) => console.log(`[HOST] ${s.message}`),
      onConnected: (peerId, mode) => console.log(`[HOST] Conectado a ${peerId} via ${mode}`),
      onDisconnected: (peerId, reason) => console.log(`[HOST] Desconectado: ${reason}`),
      onError: (code, msg) => console.log(`[HOST] Error ${code}: ${msg}`),
    },
  });

  const guest = new P2PManager({
    sessionToken: 42,
    callbacks: {
      onStatus: (s) => console.log(`[GUEST] ${s.message}`),
      onConnected: (peerId, mode) => console.log(`[GUEST] Conectado a ${peerId} via ${mode}`),
      onDisconnected: (peerId, reason) => console.log(`[GUEST] Desconectado: ${reason}`),
      onError: (code, msg) => console.log(`[GUEST] Error ${code}: ${msg}`),
    },
  });

  // Inyectar NAT (evita llamadas STUN reales durante demo)
  const ips = NatDetector.getLocalIps();
  host.setNatResult({ publicIp: '203.0.113.10', publicPort: 55001, natType: 'cone' });
  guest.setNatResult({ publicIp: '203.0.113.20', publicPort: 55002, natType: 'cone' });

  // 1. Host inicia
  await host.startHost();
  const hostCandidate = await host.sendCandidate();
  if (!hostCandidate) { console.error('Host candidate es null'); return; }
  console.log(`[HOST] Candidate: ${hostCandidate.publicIp}:${hostCandidate.publicPort} NAT=${hostCandidate.natType}`);

  // 2. Guest se une
  await guest.startJoin(hostCandidate);
  const guestCandidate = await guest.sendCandidate();
  if (!guestCandidate) { console.error('Guest candidate es null'); return; }
  console.log(`[GUEST] Candidate: ${guestCandidate.publicIp}:${guestCandidate.publicPort} NAT=${guestCandidate.natType}`);

  // 3. Host recibe al guest (simula signaling vía Nakama)
  await host.onGuestJoin(guestCandidate, 42);

  // 4. Ambos inician keepalive
  host.startKeepalive(() => console.log('[HOST] Peer perdido'));
  guest.startKeepalive(() => console.log('[GUEST] Peer perdido'));

  console.log('\n=== Conectados. Intercambiando datos... ===\n');

  // 5. Host envía datos de juego al guest
  await host.sendGameData(Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F])); // "Hello"
  console.log('[HOST] Enviado: Hello');

  // 6. Esperar un momento para que fluyan los keepalives
  await new Promise((r) => setTimeout(r, 500));

  // 7. Limpiar
  host.stopKeepalive();
  guest.stopKeepalive();
  await host.disconnect();
  await guest.disconnect();

  console.log('\n=== Demo completada ===');
}

main().catch(console.error);
