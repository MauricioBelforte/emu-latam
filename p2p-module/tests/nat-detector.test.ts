import { describe, it, expect } from 'vitest';
import { NatDetector } from '../src/NatDetector';

describe('NatDetector', () => {
  it('getLocalIps returns array of strings', () => {
    const ips = NatDetector.getLocalIps();
    expect(Array.isArray(ips)).toBe(true);
    for (const ip of ips) {
      expect(typeof ip).toBe('string');
      expect(ip.split('.')).toHaveLength(4);
    }
  });

  it('isSameSubnet returns true for same class C', () => {
    expect(NatDetector.isSameSubnet('192.168.1.10', '192.168.1.20')).toBe(true);
  });

  it('isSameSubnet returns false for different class C', () => {
    expect(NatDetector.isSameSubnet('192.168.1.10', '192.168.2.10')).toBe(false);
  });

  it('isSameSubnet works with /16 boundaries', () => {
    expect(NatDetector.isSameSubnet('10.0.0.5', '10.0.0.120')).toBe(true);
    expect(NatDetector.isSameSubnet('10.0.1.5', '10.0.2.5')).toBe(false);
  });
});
