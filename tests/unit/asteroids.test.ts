import { describe, expect, it } from 'vitest';
import { splitRock, stepRock, type Rock, type SplitRules } from '../../src/logic/asteroids';
import { createRng } from '../../src/logic/rng';

const parent: Rock = { x: 100, y: 120, vx: 0, vy: 20, angle: 0, spin: 30 };
const rules: SplitRules = { pieces: 3, speed: 60, fanDeg: 120, jitterDeg: 10, maxSpin: 180 };
const dirDeg = (r: Rock) => (Math.atan2(r.vx, r.vy) * 180) / Math.PI;

describe('stepRock', () => {
  it('drifts in a straight line and spins', () => {
    expect(stepRock(parent, 2)).toEqual({ ...parent, y: 160, angle: 60 });
  });
  it('keeps the angle within one turn', () => {
    expect(stepRock({ ...parent, angle: 350, spin: 30 }, 1).angle).toBe(20);
  });
  it('rejects negative time', () => {
    expect(() => stepRock(parent, -1)).toThrow(RangeError);
  });
});

describe('splitRock', () => {
  it('breaks into the configured number of pieces at the parent position', () => {
    const pieces = splitRock(parent, rules, createRng(1));
    expect(pieces).toHaveLength(3);
    for (const p of pieces) expect(p).toMatchObject({ x: 100, y: 120 });
  });

  it('fans the pieces out left, centre and right, all heading down', () => {
    const still: Rock = { ...parent, vx: 0, vy: 0 };
    const dirs = splitRock(still, rules, createRng(2)).map(dirDeg);
    expect(dirs[0]).toBeCloseTo(-60, -1); // within the ±10° jitter
    expect(dirs[1]).toBeCloseTo(0, -1);
    expect(dirs[2]).toBeCloseTo(60, -1);
    for (const d of dirs) expect(Math.abs(d)).toBeLessThanOrEqual(70 + 1e-9);
  });

  it('pieces keep half the parent velocity', () => {
    const noJitter = { ...rules, pieces: 1, jitterDeg: 0 };
    const [only] = splitRock({ ...parent, vx: 40, vy: 20 }, noJitter, createRng(3));
    expect(only?.vx).toBeCloseTo(20);
    expect(only?.vy).toBeCloseTo(60 + 10);
  });

  it('is repeatable for the same seed', () => {
    expect(splitRock(parent, rules, createRng(9))).toEqual(splitRock(parent, rules, createRng(9)));
  });

  it('gives each piece its own spin within the limit', () => {
    const spins = splitRock(parent, { ...rules, pieces: 20 }, createRng(4)).map((p) => p.spin);
    for (const s of spins) expect(Math.abs(s)).toBeLessThanOrEqual(180);
    expect(new Set(spins).size).toBe(20);
  });

  it('rejects rules that would send pieces upward, or no pieces', () => {
    expect(() => splitRock(parent, { ...rules, pieces: 0 }, createRng(1))).toThrow(RangeError);
    expect(() => splitRock(parent, { ...rules, fanDeg: 170 }, createRng(1))).toThrow(RangeError);
    expect(() => splitRock(parent, { ...rules, fanDeg: -1 }, createRng(1))).toThrow(RangeError);
  });
});
