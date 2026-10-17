import { describe, expect, it } from 'vitest';
import { applyDamage, stepSpawner } from '../../src/logic/enemy';

describe('applyDamage', () => {
  it('reduces health and reports destruction at zero', () => {
    expect(applyDamage(3, 1)).toEqual({ hp: 2, destroyed: false });
    expect(applyDamage(1, 1)).toEqual({ hp: 0, destroyed: true });
  });

  it('never goes below zero', () => {
    expect(applyDamage(2, 5)).toEqual({ hp: 0, destroyed: true });
  });

  it('treats zero damage as no change', () => {
    expect(applyDamage(3, 0)).toEqual({ hp: 3, destroyed: false });
  });

  it('rejects negative damage', () => {
    expect(() => applyDamage(3, -1)).toThrow(RangeError);
  });
});

describe('stepSpawner', () => {
  it('counts down without spawning', () => {
    const r = stepSpawner(1, 0.25, 1.4);
    expect(r.spawn).toBe(false);
    expect(r.timeLeft).toBeCloseTo(0.75);
  });

  it('spawns when the timer runs out and restarts it', () => {
    const r = stepSpawner(0.1, 0.15, 1.4);
    expect(r.spawn).toBe(true);
    expect(r.timeLeft).toBeCloseTo(1.35); // overshoot of 0.05 carried over
  });

  it('spawns one per interval over time at 60 fps', () => {
    let t = 0;
    let spawned = 0;
    for (let i = 0; i < 60 * 7; i++) {
      const r = stepSpawner(t, 1 / 60, 1.4);
      t = r.timeLeft;
      if (r.spawn) spawned++;
    }
    expect(spawned).toBe(5); // at 0, 1.4, 2.8, 4.2, 5.6 s
  });

  it('never spawns a crowd after a long frame', () => {
    const r = stepSpawner(0, 10, 1.4);
    expect(r.spawn).toBe(true);
    expect(r.timeLeft).toBeCloseTo(1.4); // already ready: nothing carried over
    expect(stepSpawner(r.timeLeft, 0.01, 1.4).spawn).toBe(false);
  });

  it('caps carried-over time at half an interval', () => {
    const r = stepSpawner(0.1, 10, 1.4);
    expect(r.spawn).toBe(true);
    expect(r.timeLeft).toBeCloseTo(0.7);
  });

  it('rejects a non-positive interval', () => {
    expect(() => stepSpawner(1, 0.1, 0)).toThrow(RangeError);
  });
});
