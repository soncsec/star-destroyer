import { describe, expect, it } from 'vitest';
import { DIFFICULTY, ENEMY_FIRE, POWERUPS } from '../../src/config/tuning';
import { levelDifficulty } from '../../src/levels/difficulty';
import { difficulty } from '../../src/logic/difficulty';
import type { DropRules, PowerUpKind } from '../../src/logic/drops';

const base = {
  fire: { interval: 2, jitter: 0.4, firstShotMin: 0.6 },
  shotSpeed: 100,
  drops: { chance: 0.1, weights: { weapon: 6, shield: 3, clear: 1, health: 2 } },
};
const curve = { lastLevel: 8, fireRateAtLast: 2.5, shotSpeedAtLast: 1.3, helpfulDropsAtLast: 1.25 };
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

/** Chance per kill of dropping one kind. */
const share = (d: DropRules, kind: PowerUpKind): number =>
  (d.chance * d.weights[kind]) / Object.values(d.weights).reduce((a, b) => a + b, 0);
/** Shots per second for one enemy. */
const fireRate = (level: number): number => 1 / difficulty(level, base, curve).fire.interval;

describe('difficulty', () => {
  it('level 1 is exactly the base numbers', () => {
    expect(difficulty(1, base, curve)).toEqual(base);
  });

  it('fire rate rises by the same percentage every level, to 2.5× at the last', () => {
    const steps = LEVELS.slice(1).map((l) => fireRate(l) / fireRate(l - 1));
    for (const s of steps) expect(s).toBeCloseTo(2.5 ** (1 / 7), 10);
    expect(fireRate(8) / fireRate(1)).toBeCloseTo(2.5, 10);
  });

  it('keeps the random spread in proportion, and the first-shot grace unchanged', () => {
    const d = difficulty(8, base, curve);
    expect(d.fire.jitter / d.fire.interval).toBeCloseTo(base.fire.jitter / base.fire.interval);
    expect(d.fire.firstShotMin).toBe(base.fire.firstShotMin);
  });

  it('shot speed rises evenly to +30% at the last level', () => {
    expect(difficulty(8, base, curve).shotSpeed).toBeCloseTo(130);
    expect(difficulty(5, base, curve).shotSpeed).toBeCloseTo(100 + (30 * 4) / 7);
  });

  it('weapon and shield gems become 25% more common; the screen clear stays as rare', () => {
    const first = difficulty(1, base, curve).drops;
    const last = difficulty(8, base, curve).drops;
    expect(share(last, 'weapon') / share(first, 'weapon')).toBeCloseTo(1.25);
    expect(share(last, 'shield') / share(first, 'shield')).toBeCloseTo(1.25);
    expect(share(last, 'clear')).toBeCloseTo(share(first, 'clear'), 12);
  });

  it('the health gem stays exactly as rare at every level (M7.18)', () => {
    const first = difficulty(1, base, curve).drops;
    for (const level of LEVELS) {
      expect(share(difficulty(level, base, curve).drops, 'health')).toBeCloseTo(
        share(first, 'health'),
        12,
      );
    }
  });

  it('accepts only whole levels from 1 to the last', () => {
    for (const bad of [0, 9, 1.5, -1, Number.NaN]) {
      expect(() => difficulty(bad, base, curve)).toThrow(RangeError);
    }
  });

  it('a one-level game is just the base', () => {
    expect(difficulty(1, base, { ...curve, lastLevel: 1 })).toEqual(base);
  });
});

describe('the tuned difficulty respects the limits in PROJECT.md 4a', () => {
  const all = LEVELS.map(levelDifficulty);
  const rate = (i: number): number => 1 / (all[i]?.fire.interval ?? Number.NaN);

  it('covers all 8 levels, starting from the level-1 tuning', () => {
    expect(DIFFICULTY.lastLevel).toBe(8);
    expect(all[0]?.fire.interval).toBe(ENEMY_FIRE.interval);
    expect(all[0]?.shotSpeed).toBe(ENEMY_FIRE.speed);
    expect(all[0]?.drops).toEqual(POWERUPS.drops);
  });

  it('level 8 fires at most 2.5× as often as level 1, about +14% per level', () => {
    expect(rate(7) / rate(0)).toBeLessThanOrEqual(2.5 + 1e-9);
    for (let i = 1; i < 8; i++) {
      const step = rate(i) / rate(i - 1);
      expect(step).toBeGreaterThan(1);
      expect(step).toBeLessThanOrEqual(1.14);
    }
  });

  it('enemy shots are at most 30% faster by level 8, and never slower', () => {
    expect((all[7]?.shotSpeed ?? 0) / ENEMY_FIRE.speed).toBeLessThanOrEqual(1.3 + 1e-9);
    for (let i = 1; i < 8; i++) {
      expect(all[i]?.shotSpeed).toBeGreaterThanOrEqual(all[i - 1]?.shotSpeed ?? Infinity);
    }
  });

  it('shield and weapon drops get slightly more common; the screen clear never does', () => {
    for (let i = 1; i < 8; i++) {
      const [before, now] = [all[i - 1]?.drops, all[i]?.drops];
      if (!before || !now) throw new Error('missing level');
      expect(share(now, 'weapon')).toBeGreaterThan(share(before, 'weapon'));
      expect(share(now, 'shield')).toBeGreaterThan(share(before, 'shield'));
      expect(share(now, 'clear')).toBeLessThanOrEqual(share(before, 'clear') + 1e-12);
      expect(share(now, 'health')).toBeLessThanOrEqual(share(before, 'health') + 1e-12);
    }
    const last = all[7]?.drops;
    if (!last) throw new Error('missing level 8');
    expect(share(last, 'weapon') / share(POWERUPS.drops, 'weapon')).toBeLessThanOrEqual(1.5);
  });

  it('every level keeps the shot timing valid (spread smaller than the gap)', () => {
    for (const d of all) {
      expect(d.fire.jitter).toBeGreaterThanOrEqual(0);
      expect(d.fire.jitter).toBeLessThan(d.fire.interval);
      expect(d.drops.chance).toBeLessThanOrEqual(1);
    }
  });
});
