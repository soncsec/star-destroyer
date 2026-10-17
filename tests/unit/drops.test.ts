import { describe, expect, it } from 'vitest';
import { rollDrop, type DropRules, type PowerUpKind } from '../../src/logic/drops';
import { createRng } from '../../src/logic/rng';

const rules: DropRules = { chance: 0.2, weights: { weapon: 6, shield: 3, clear: 1 } };

/** Rolls `n` kills and counts what dropped. */
function tally(n: number, r: DropRules, bossFight: boolean, seed = 1) {
  const rng = createRng(seed);
  const counts: Record<PowerUpKind | 'none', number> = { weapon: 0, shield: 0, clear: 0, none: 0 };
  for (let i = 0; i < n; i++) counts[rollDrop(rng, r, { bossFight }) ?? 'none']++;
  return counts;
}

describe('rollDrop', () => {
  it('drops on about the configured share of kills', () => {
    const c = tally(20_000, rules, false);
    expect(1 - c.none / 20_000).toBeCloseTo(0.2, 1);
  });

  it('weapon is common, shield uncommon, screen clear rare', () => {
    const c = tally(50_000, rules, false);
    const drops = c.weapon + c.shield + c.clear;
    expect(c.weapon / drops).toBeCloseTo(0.6, 1);
    expect(c.shield / drops).toBeCloseTo(0.3, 1);
    expect(c.clear / drops).toBeCloseTo(0.1, 1);
  });

  it('never drops a screen clear during a boss fight', () => {
    const c = tally(50_000, rules, true);
    expect(c.clear).toBe(0);
    expect(c.weapon + c.shield).toBeGreaterThan(0);
  });

  it('is repeatable for the same seed', () => {
    expect(tally(500, rules, false, 7)).toEqual(tally(500, rules, false, 7));
  });

  it('drops nothing at chance 0 and something every time at chance 1', () => {
    expect(tally(200, { ...rules, chance: 0 }, false).none).toBe(200);
    expect(tally(200, { ...rules, chance: 1 }, false).none).toBe(0);
  });

  it('uses the same amount of randomness whether or not it drops', () => {
    // Two numbers per call, so later rolls don't shift when the chance changes.
    const a = createRng(3);
    const b = createRng(3);
    rollDrop(a, { ...rules, chance: 0 }, { bossFight: false });
    rollDrop(b, { ...rules, chance: 1 }, { bossFight: false });
    expect(a.next()).toBe(b.next());
  });

  it('rejects a chance outside 0 to 1', () => {
    expect(() => rollDrop(createRng(1), { ...rules, chance: 1.5 }, { bossFight: false })).toThrow(
      RangeError,
    );
    expect(() => rollDrop(createRng(1), { ...rules, chance: -0.1 }, { bossFight: false })).toThrow(
      RangeError,
    );
  });
});
