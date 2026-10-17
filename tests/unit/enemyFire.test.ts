import { describe, expect, it } from 'vitest';
import {
  aimDown,
  firstShotDelay,
  nextShotDelay,
  stepEnemyFire,
  type EnemyFireRules,
} from '../../src/logic/enemyFire';
import { createRng } from '../../src/logic/rng';

const rules: EnemyFireRules = { interval: 2, jitter: 0.5, firstShotMin: 0.6 };
const deg = (v: { x: number; y: number }) => (Math.atan2(v.x, v.y) * 180) / Math.PI;

describe('nextShotDelay', () => {
  it('stays within interval ± jitter', () => {
    const rng = createRng(1);
    for (let i = 0; i < 500; i++) {
      const d = nextShotDelay(rng, rules);
      expect(d).toBeGreaterThanOrEqual(1.5);
      expect(d).toBeLessThan(2.5);
    }
  });

  it('is repeatable for the same seed and varies between shots', () => {
    const a = createRng(7);
    const b = createRng(7);
    const fromA = [1, 2, 3].map(() => nextShotDelay(a, rules));
    expect([1, 2, 3].map(() => nextShotDelay(b, rules))).toEqual(fromA);
    expect(new Set(fromA).size).toBe(3);
  });

  it('rejects bad rules', () => {
    const rng = createRng(1);
    expect(() => nextShotDelay(rng, { ...rules, interval: 0 })).toThrow(RangeError);
    expect(() => nextShotDelay(rng, { ...rules, jitter: 2 })).toThrow(RangeError);
    expect(() => nextShotDelay(rng, { ...rules, jitter: -1 })).toThrow(RangeError);
  });
});

describe('firstShotDelay', () => {
  it('never comes sooner than firstShotMin', () => {
    const rng = createRng(3);
    const quick = { interval: 0.5, jitter: 0.4, firstShotMin: 0.6 };
    for (let i = 0; i < 200; i++) expect(firstShotDelay(rng, quick)).toBeGreaterThanOrEqual(0.6);
  });
});

describe('stepEnemyFire', () => {
  const next = () => 2;

  it('counts down and fires when the timer runs out, then restarts it', () => {
    expect(stepEnemyFire(1, 0.4, true, next)).toEqual({ timeLeft: 0.6, fire: false });
    expect(stepEnemyFire(0.3, 0.4, true, next)).toEqual({ timeLeft: 2, fire: true });
  });

  it('does not count down or fire while off screen', () => {
    expect(stepEnemyFire(0.1, 1, false, next)).toEqual({ timeLeft: 0.1, fire: false });
  });

  it('fires at most once per step, even after a long frame', () => {
    expect(stepEnemyFire(0.1, 10, true, next)).toEqual({ timeLeft: 2, fire: true });
  });

  it('rejects negative time', () => {
    expect(() => stepEnemyFire(1, -1, true, next)).toThrow(RangeError);
  });
});

describe('aimDown', () => {
  it('aims straight at a target below within the limit, at full speed', () => {
    const v = aimDown({ x: 100, y: 0 }, { x: 110, y: 100 }, 100, 30);
    expect(deg(v)).toBeCloseTo((Math.atan2(10, 100) * 180) / Math.PI);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(100);
  });

  it('never turns more than the limit away from straight down', () => {
    expect(deg(aimDown({ x: 0, y: 0 }, { x: 500, y: 10 }, 100, 30))).toBeCloseTo(30);
    expect(deg(aimDown({ x: 0, y: 0 }, { x: -500, y: 10 }, 100, 30))).toBeCloseTo(-30);
  });

  it('shoots straight down at a target level with or above the shooter', () => {
    expect(aimDown({ x: 0, y: 100 }, { x: 50, y: 20 }, 80, 30)).toEqual({ x: 0, y: 80 });
    expect(aimDown({ x: 0, y: 100 }, { x: 50, y: 100 }, 80, 30)).toEqual({ x: 0, y: 80 });
  });

  it('rejects bad speed or angle', () => {
    expect(() => aimDown({ x: 0, y: 0 }, { x: 0, y: 1 }, 0, 30)).toThrow(RangeError);
    expect(() => aimDown({ x: 0, y: 0 }, { x: 0, y: 1 }, 1, 90)).toThrow(RangeError);
  });
});
