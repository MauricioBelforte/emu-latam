import { describe, it, expect } from 'vitest';
import { P2PManager } from '../src/P2PManager';
import { NatDetector } from '../src/NatDetector';
import { PeerCandidate, PROTOCOL_VERSION } from '../src/protocol/types';

describe('P2P Integration', () => {
  it('host and guest connect via LAN (loopback)', async () => {
    let hostConnected = false;
    let guestConnected = false;

    const host = new P2PManager({
      sessionToken: 1,
      callbacks: {
        onStatus: () => {},
        onConnected: () => { hostConnected = true; },
        onDisconnected: () => {},
        onError: () => {},
      },
    });

    const guest = new P2PManager({
      sessionToken: 1,
      callbacks: {
        onStatus: () => {},
        onConnected: () => { guestConnected = true; },
        onDisconnected: () => {},
        onError: () => {},
      },
    });

    const localIps = NatDetector.getLocalIps();
    host.setNatResult({ publicIp: '203.0.113.10', publicPort: 55001, natType: 'cone' });
    guest.setNatResult({ publicIp: '203.0.113.20', publicPort: 55002, natType: 'cone' });

    await host.startHost();
    const hostCandidate = (await host.sendCandidate())!;

    await guest.startJoin(hostCandidate);

    const guestCandidate = (await guest.sendCandidate())!;
    await host.onGuestJoin(guestCandidate, 1);

    expect(hostConnected).toBe(true);
    expect(guestConnected).toBe(true);

    host.disconnect();
    guest.disconnect();
  });

  it('host relays when hole punch fails (symmetric symmetric)', async () => {
    const hostConnected: string[] = [];

    const host = new P2PManager({
      sessionToken: 2,
      callbacks: {
        onStatus: () => {},
        onConnected: (peerId, mode) => hostConnected.push(`${peerId}:${mode}`),
        onDisconnected: () => {},
        onError: () => {},
      },
    });

    host.setNatResult({ publicIp: '203.0.113.10', publicPort: 55001, natType: 'symmetric' });
    await host.startHost();

    const remoteGuest: PeerCandidate = {
      peerId: 'guest1',
      publicIp: '198.51.100.99',
      publicPort: 9999,
      privateIps: ['10.0.0.5'],
      natType: 'symmetric',
      protocolVersion: PROTOCOL_VERSION,
    };
    await host.onGuestJoin(remoteGuest, 42);

    expect(hostConnected).toContain('guest1:relay');
    host.disconnect();
  });
});
