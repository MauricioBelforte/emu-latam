import os from 'os';
import { UDPTransport } from './UDPTransport';
import { NatResult, NatType } from './protocol/types';

const STUN_SERVERS = [
  { host: 'stun.l.google.com', port: 19302 },
  { host: 'stun1.l.google.com', port: 19302 },
];

export class NatDetector {
  static getLocalIps(): string[] {
    const ips: string[] = [];
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address);
        }
      }
    }
    return ips;
  }

  static isSameSubnet(ip1: string, ip2: string): boolean {
    const parts = (ip: string) => ip.split('.').slice(0, 3).map(Number);
    const a = parts(ip1);
    const b = parts(ip2);
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  static async detect(transport: UDPTransport): Promise<NatResult> {
    const [r1, r2] = await Promise.all([
      transport.stunBindingRequest(STUN_SERVERS[0]),
      transport.stunBindingRequest(STUN_SERVERS[1]),
    ]);

    if (!r1 || !r2) {
      return {
        publicIp: r1?.address ?? '',
        publicPort: r1?.port ?? 0,
        natType: 'symmetric',
      };
    }

    const natType: NatType = r1.port === r2.port ? 'cone' : 'symmetric';
    return { publicIp: r1.address, publicPort: r1.port, natType };
  }
}
