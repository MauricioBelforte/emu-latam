// Tipos compartidos del módulo P2P

export type NatType = 'cone' | 'symmetric';

export type PeerRole = 'host' | 'guest';

export type PeerState =
  | 'idle'
  | 'discovering'
  | 'signaling'
  | 'lan_check'
  | 'lan_connected'
  | 'punching'
  | 'direct_connected'
  | 'relay_connected'
  | 'game_running'
  | 'disconnected'
  | 'failed';

export enum PacketType {
  PUNCH = 0x01,
  PUNCH_ACK = 0x02,
  KEEPALIVE = 0x03,
  KEEPALIVE_ACK = 0x04,
  RELAY_DATA = 0x05,
  DISCONNECT = 0x06,
}

export interface PeerCandidate {
  peerId: string;
  publicIp: string;
  publicPort: number;
  privateIps: string[];
  natType: NatType;
  protocolVersion: number;
}

export interface NatResult {
  publicIp: string;
  publicPort: number;
  natType: NatType;
}

export interface DecodedPacket {
  version: number;
  type: PacketType;
  sessionToken: number;
  payload: Buffer;
}

export interface GuestRoute {
  peerId: string;
  remoteAddr: string;
  remotePort: number;
  localForwardSocket: import('dgram').Socket;
  lastSeen: number;
}

export interface P2PStatus {
  state: PeerState;
  progress: number;
  message: string;
  mode: 'lan' | 'direct' | 'relay' | null;
}

export interface P2PEventCallbacks {
  onStatus: (status: P2PStatus) => void;
  onConnected: (peerId: string, mode: 'lan' | 'direct' | 'relay') => void;
  onDisconnected: (peerId: string, reason: string) => void;
  onError: (code: string, message: string) => void;
}

export const PROTOCOL_VERSION = 1;
export const RETROARCH_PORT = 55435;
export const KEEPALIVE_INTERVAL_MS = 18000;
export const KEEPALIVE_MAX_MISSED = 3;
