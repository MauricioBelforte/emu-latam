import { describe, it, expect } from 'vitest';
import { UDPTransport } from '../src/UDPTransport';
import { RelayServer } from '../src/RelayServer';
import { encodePacket } from '../src/protocol/packet';
import { PacketType, RETROARCH_PORT } from '../src/protocol/types';

describe('RelayServer', () => {
  it('relays data between guest socket and registerd peer', async () => {
    const transport = new UDPTransport();
    const relayPort = await transport.bind(0);
    const relay = new RelayServer(transport);

    const fakeRa = new UDPTransport();
    const fakeRaPort = await fakeRa.bind(RETROARCH_PORT, '127.0.0.1');

    // Registramos peer
    relay.registerPeer('guest1', 42);

    // Creamos un guest externo
    const guest = new UDPTransport();
    await guest.bind(0);

    // Mandamos RELAY_DATA from guest
    const gameData = Buffer.from([0x10, 0x20, 0x30]);
    const relayPkt = encodePacket(PacketType.RELAY_DATA, 42, gameData);
    await guest.send(relayPkt, relayPort, '127.0.0.1');

    // El Fake RA debería recibir
    const received = await new Promise<Buffer>((resolve) => {
      fakeRa.onRawMessage((data) => resolve(data));
    });
    expect([...received]).toEqual([0x10, 0x20, 0x30]);

    relay.removeAll();
    transport.close();
    fakeRa.close();
    guest.close();
  });
});
