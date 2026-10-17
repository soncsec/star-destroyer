import { describe, expect, it } from 'vitest';
import { stepFire } from '../../src/logic/weapon';

const INTERVAL = 0.2;

/** Simulates holding (or not) fire for `seconds` at a fixed frame time; returns shot count. */
function shotsOver(seconds: number, frame: number, held = true, startCooldown = 0): number {
  let state = { cooldown: startCooldown };
  let shots = 0;
  for (let t = 0; t < seconds - 1e-9; t += frame) {
    const r = stepFire(state, held, frame, INTERVAL);
    state = r.state;
    if (r.fire) shots++;
  }
  return shots;
}

describe('stepFire', () => {
  it('fires immediately when ready and fire is pressed', () => {
    expect(stepFire({ cooldown: 0 }, true, 1 / 60, INTERVAL).fire).toBe(true);
  });

  it('does not fire while fire is not held', () => {
    expect(shotsOver(2, 1 / 60, false)).toBe(0);
  });

  it('fires once per interval while held (5 shots per second at 0.2 s)', () => {
    expect(shotsOver(1, 1 / 60)).toBe(5);
    expect(shotsOver(1, 1 / 30)).toBe(5);
  });

  it('waits for the cooldown before the next shot', () => {
    const first = stepFire({ cooldown: 0 }, true, 0.016, INTERVAL);
    expect(first.fire).toBe(true);
    const tooSoon = stepFire(first.state, true, 0.1, INTERVAL);
    expect(tooSoon.fire).toBe(false);
  });

  it('never fires a burst after a long frame', () => {
    const r = stepFire({ cooldown: 0 }, true, 5, INTERVAL);
    expect(r.fire).toBe(true);
    // The next shot is a full interval away, not instantly ready.
    expect(r.state.cooldown).toBeCloseTo(INTERVAL);
    expect(stepFire(r.state, true, 0.01, INTERVAL).fire).toBe(false);
  });

  it('caps carried-over time at half an interval', () => {
    const r = stepFire({ cooldown: 0.05 }, true, 1, INTERVAL);
    expect(r.fire).toBe(true);
    expect(r.state.cooldown).toBeCloseTo(INTERVAL / 2);
  });

  it('is ready at once after releasing for longer than the interval', () => {
    const fired = stepFire({ cooldown: 0 }, true, 0.016, INTERVAL);
    const released = stepFire(fired.state, false, 1, INTERVAL);
    expect(released.state.cooldown).toBe(0);
    expect(stepFire(released.state, true, 0.016, INTERVAL).fire).toBe(true);
  });
});
