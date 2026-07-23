import { describe, it, expect } from 'vitest';
import { StateMachine } from '../src/StateMachine';

describe('StateMachine', () => {
  it('starts idle', () => {
    const sm = new StateMachine();
    expect(sm.state).toBe('idle');
  });

  it('transitions idle -> discovering', () => {
    const sm = new StateMachine();
    expect(sm.transition('discovery_done')).toBe(true);
    expect(sm.state).toBe('discovering');
  });

  it('rejects invalid transition', () => {
    const sm = new StateMachine();
    expect(sm.transition('punch_success')).toBe(false);
    expect(sm.state).toBe('idle');
  });

  it('full host flow', () => {
    const sm = new StateMachine();
    sm.transition('discovery_done');    // idle -> discovering
    sm.transition('lan_mismatch');      // discovering -> signaling
    sm.transition('signaling_prepare_for_punch'); // signaling -> punching
    sm.transition('punch_success');     // punching -> direct_connected
    sm.transition('game_ready');        // direct_connected -> game_running
    expect(sm.state).toBe('game_running');
  });

  it('can() checks if transition is possible', () => {
    const sm = new StateMachine();
    expect(sm.can('discovery_done')).toBe(true);
    expect(sm.can('punch_success')).toBe(false);
  });

  it('reset goes back to idle', () => {
    const sm = new StateMachine();
    sm.transition('discovery_done');
    sm.transition('lan_mismatch');
    expect(sm.state).toBe('signaling');
    sm.reset();
    expect(sm.state).toBe('idle');
  });

  it('force sets state directly', () => {
    const sm = new StateMachine();
    sm.force('game_running');
    expect(sm.state).toBe('game_running');
  });

  it('calls event listeners', () => {
    const sm = new StateMachine();
    let called = false;
    sm.on('discovery_done', () => { called = true; });
    sm.transition('discovery_done');
    expect(called).toBe(true);
  });

  it('off removes listener', () => {
    const sm = new StateMachine();
    let count = 0;
    const fn = () => { count++; };
    sm.on('discovery_done', fn);
    sm.off('discovery_done', fn);
    sm.transition('discovery_done');
    expect(count).toBe(0);
  });

  it('relay fallback flow', () => {
    const sm = new StateMachine();
    sm.transition('discovery_done');
    sm.transition('lan_mismatch');
    sm.transition('signaling_prepare_for_punch');
    sm.transition('punch_fail');         // punching -> relay_started
    expect(sm.state).toBe('relay_started');
    sm.transition('signaling_guest_joined'); // relay_started -> relay_connected
    expect(sm.state).toBe('relay_connected');
  });

  it('disconnected -> idle on reset', () => {
    const sm = new StateMachine();
    sm.force('disconnected');
    sm.transition('reset');
    expect(sm.state).toBe('idle');
  });
});
