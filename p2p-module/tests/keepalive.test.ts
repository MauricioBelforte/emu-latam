import { describe, it, expect, vi } from 'vitest';
import { KeepAliveService } from '../src/KeepAliveService';
import { UDPTransport } from '../src/UDPTransport';
import { encodePacket } from '../src/protocol/packet';
import { PacketType } from '../src/protocol/types';

describe('KeepAliveService', () => {
  it('calls onLost after max missed keepalives', async () => {
    const transport = new UDPTransport();
    await transport.bind(0);
    const ka = new KeepAliveService(transport, 50); // 50ms interval for test
    const onLost = vi.fn();

    ka.start(42, '127.0.0.1', transport.port, onLost);

    // 3 strikes * 50ms + margin
    await new Promise((r) => setTimeout(r, 300));

    expect(onLost).toHaveBeenCalled();
    ka.stop();
    transport.close();
  });

  it('does not call onLost when ack is received', async () => {
    const transport = new UDPTransport();
    await transport.bind(0);
    const ka = new KeepAliveService(transport, 50);
    const onLost = vi.fn();

    ka.start(42, '127.0.0.1', transport.port, onLost);

    const interval = setInterval(async () => {
      const ack = encodePacket(PacketType.KEEPALIVE_ACK, 42);
      await transport.send(ack, transport.port, '127.0.0.1');
    }, 60);

    await new Promise((r) => setTimeout(r, 350));
    clearInterval(interval);

    expect(onLost).not.toHaveBeenCalled();
    ka.stop();
    transport.close();
  });
});
