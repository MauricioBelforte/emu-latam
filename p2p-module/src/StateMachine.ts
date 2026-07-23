import { PeerState } from './protocol/types';

export type StateEvent =
  | 'discovery_done'
  | 'lan_match'
  | 'lan_mismatch'
  | 'punch_success'
  | 'punch_fail'
  | 'relay_started'
  | 'relay_candidate_sent'
  | 'game_ready'
  | 'disconnected'
  | 'retry'
  | 'reset'
  | 'signaling_candidates_received'
  | 'signaling_prepare_for_punch'
  | 'signaling_guest_joined';

interface Transition {
  from: PeerState[];
  to: PeerState;
  on: StateEvent;
}

const TRANSITIONS: Transition[] = [
  { from: ['idle'], to: 'discovering', on: 'discovery_done' },
  { from: ['discovering'], to: 'lan_check', on: 'lan_match' },
  { from: ['discovering'], to: 'signaling', on: 'lan_mismatch' },
  { from: ['signaling'], to: 'lan_check', on: 'signaling_candidates_received' },
  { from: ['signaling'], to: 'punching', on: 'signaling_prepare_for_punch' },
  { from: ['signaling'], to: 'relay_started', on: 'relay_candidate_sent' },
  { from: ['signaling'], to: 'relay_started', on: 'punch_fail' },
  { from: ['lan_check'], to: 'lan_connected', on: 'lan_match' },
  { from: ['lan_check'], to: 'punching', on: 'pun_ch' },
  { from: ['lan_check'], to: 'relay_started', on: 'lan_mismatch' },
  { from: ['punching'], to: 'direct_connected', on: 'punch_success' },
  { from: ['punching'], to: 'relay_started', on: 'punch_fail' },
  { from: ['lan_connected'], to: 'game_running', on: 'game_ready' },
  { from: ['direct_connected'], to: 'game_running', on: 'game_ready' },
  { from: ['relay_started'], to: 'relay_connected', on: 'signaling_guest_joined' },
  { from: ['relay_connected'], to: 'game_running', on: 'game_ready' },
  { from: ['game_running'], to: 'disconnected', on: 'disconnected' },
  { from: ['disconnected'], to: 'idle', on: 'reset' },
  { from: ['failed'], to: 'idle', on: 'reset' },
  { from: ['lan_check'], to: 'punching', on: 'lan_mismatch' },
];

export class StateMachine {
  private _state: PeerState = 'idle';
  private listeners = new Map<StateEvent, (() => void)[]>();

  get state(): PeerState {
    return this._state;
  }

  transition(event: StateEvent): boolean {
    for (const t of TRANSITIONS) {
      if (t.on === event && t.from.includes(this._state)) {
        this._state = t.to;
        const evListeners = this.listeners.get(event);
        if (evListeners) {
          for (const fn of evListeners) fn();
        }
        return true;
      }
    }
    return false;
  }

  can(event: StateEvent): boolean {
    return TRANSITIONS.some((t) => t.on === event && t.from.includes(this._state));
  }

  force(state: PeerState): void {
    this._state = state;
  }

  on(event: StateEvent, fn: () => void): void {
    const arr = this.listeners.get(event) ?? [];
    arr.push(fn);
    this.listeners.set(event, arr);
  }

  off(event: StateEvent, fn: () => void): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(fn);
    if (idx >= 0) arr.splice(idx, 1);
  }

  reset(): void {
    this._state = 'idle';
    this.listeners.clear();
  }
}
