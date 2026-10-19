import { describe, expect, it } from 'vitest';
import { WEAPON_LEVELS } from '../../src/config/tuning';
import { levelUp, shotAngle, volley, type WeaponLevel } from '../../src/logic/weaponLevels';

describe('volley', () => {
  it('fires each slot from the muzzle at the level speed and damage', () => {
    const level: WeaponLevel = {
      shots: [
        { dx: -6, angleDeg: 0 },
        { dx: 6, angleDeg: 0 },
      ],
      damage: 1,
      speed: 300,
    };
    expect(volley(level, 100, 200)).toEqual([
      { x: 94, y: 200, vx: 0, vy: -300, damage: 1 },
      { x: 106, y: 200, vx: 0, vy: -300, damage: 1 },
    ]);
  });

  it('angles spread shots left and right at full speed', () => {
    const [left, mid, right] = volley(
      { shots: [-12, 0, 12].map((angleDeg) => ({ dx: 0, angleDeg })), damage: 2, speed: 300 },
      0,
      0,
    );
    expect(left?.vx).toBeLessThan(0);
    expect(mid?.vx).toBeCloseTo(0);
    expect(right?.vx).toBeCloseTo(-(left?.vx ?? 0));
    for (const s of [left, mid, right]) expect(Math.hypot(s?.vx ?? 0, s?.vy ?? 0)).toBeCloseTo(300);
    expect(left?.vy).toBeLessThan(0);
  });

  it('rejects a non-positive speed', () => {
    expect(() => volley({ shots: [], damage: 1, speed: 0 }, 0, 0)).toThrow(RangeError);
  });
});

describe('levelUp', () => {
  it('raises the level by one up to the top', () => {
    expect(levelUp(1, 3)).toBe(2);
    expect(levelUp(2, 3)).toBe(3);
    expect(levelUp(3, 3)).toBe(3);
  });
  it('treats anything below 1 as level 1', () => {
    expect(levelUp(0, 3)).toBe(2);
  });
  it('rejects a top level below 1', () => {
    expect(() => levelUp(1, 0)).toThrow(RangeError);
  });
});

describe('shotAngle', () => {
  it('turns right-pointing art to face the direction of travel', () => {
    expect(shotAngle(0, -300)).toBeCloseTo(-90); // straight up
    expect(shotAngle(300, 0)).toBeCloseTo(0);
  });
});

describe('the tuned weapon levels (owner requests: small to big and strong; M7.13 rays)', () => {
  it('has four levels that get more shots and more damage per volley', () => {
    expect(WEAPON_LEVELS).toHaveLength(4);
    const firepower = WEAPON_LEVELS.map((l) => l.shots.length * l.damage);
    expect(firepower).toEqual([1, 2, 4, 6]);
  });

  it('after the tracer: one large spark ray, then two, then a spread of three (owner, 2026-10-18)', () => {
    expect(WEAPON_LEVELS.map((l) => l.sprite)).toEqual([
      'shot-tracer',
      'shot-spark',
      'shot-spark',
      'shot-spark',
    ]);
    expect(WEAPON_LEVELS.map((l) => l.shots.length)).toEqual([1, 1, 2, 3]);
  });

  it('each level covers a bigger area per volley than the last', () => {
    const area = WEAPON_LEVELS.map((l) => l.shots.length * l.hitbox.w * l.hitbox.h);
    for (let i = 1; i < area.length; i++) expect(area[i]).toBeGreaterThan(area[i - 1] ?? 0);
  });

  it('stronger levels fire a little less often and fly a little slower, all 15% slower than first tuned (owner, 2026-10-18)', () => {
    const [one, two, three, four] = WEAPON_LEVELS;
    if (!one || !two || !three || !four) throw new Error('four levels expected');
    const rate = (l: { fireInterval: number }): number => 1 / l.fireInterval;
    expect(rate(one)).toBeCloseTo(5 * 0.85);
    expect(rate(two) / rate(one)).toBeCloseTo(0.95);
    expect(rate(three) / rate(one)).toBeCloseTo(0.925);
    expect(rate(four) / rate(one)).toBeCloseTo(0.9);
    // The first rebalance's speeds (340, 304, 270), 15% slower again; level 3
    // sits between the old levels 2 and 3.
    expect(Math.abs(one.speed - 340 * 0.85)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(two.speed - 304 * 0.85)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(four.speed - 270 * 0.85)).toBeLessThanOrEqual(0.5);
    expect(two.speed).toBeLessThan(one.speed);
    expect(three.speed).toBeLessThan(two.speed);
    expect(four.speed).toBeLessThan(three.speed);
  });

  it('every shot is drawn full size, its hitbox inside what is drawn (owner, 2026-10-18)', () => {
    expect(WEAPON_LEVELS.map((l) => l.scale)).toEqual([1, 1, 1, 1]);
    // The tracer: its visible 10×4 art, turned to point up.
    expect(WEAPON_LEVELS[0]?.hitbox).toEqual({ w: 4, h: 10 });
    // The ray: its solid white core, inside its visible 18×58 (turned to point up).
    for (const l of WEAPON_LEVELS.slice(1)) {
      expect(l.hitbox).toEqual({ w: 8, h: 30 });
      expect(l.hitbox.w).toBeLessThanOrEqual(18);
      expect(l.hitbox.h).toBeLessThanOrEqual(58);
    }
  });

  it('levels 1-3 fire straight; level 3 side by side; level 4 spreads left and right', () => {
    expect(WEAPON_LEVELS[0]?.shots).toEqual([{ dx: 0, angleDeg: 0 }]);
    expect(WEAPON_LEVELS[1]?.shots).toEqual([{ dx: 0, angleDeg: 0 }]);
    const two = WEAPON_LEVELS[2]?.shots ?? [];
    expect(two.every((sh) => sh.angleDeg === 0)).toBe(true);
    expect(Math.min(...two.map((sh) => sh.dx))).toBeLessThan(0);
    expect(Math.max(...two.map((sh) => sh.dx))).toBeGreaterThan(0);
    const angles = WEAPON_LEVELS[3]?.shots.map((sh) => sh.angleDeg) ?? [];
    expect(Math.min(...angles)).toBeLessThan(0);
    expect(Math.max(...angles)).toBeGreaterThan(0);
  });
});
