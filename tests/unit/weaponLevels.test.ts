import { describe, expect, it } from 'vitest';
import { WEAPON, WEAPON_LEVELS } from '../../src/config/tuning';
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

describe('the tuned weapon levels (owner request: small to big and strong)', () => {
  it('has three levels that get more shots and more damage', () => {
    expect(WEAPON_LEVELS).toHaveLength(3);
    const firepower = WEAPON_LEVELS.map((l) => l.shots.length * l.damage);
    expect(firepower[0]).toBe(1);
    expect(firepower[1]).toBeGreaterThan(firepower[0] ?? 0);
    expect(firepower[2]).toBeGreaterThan(firepower[1] ?? 0);
  });

  it('shots grow: each level hits a bigger area than the last', () => {
    const area = WEAPON_LEVELS.map((l) => l.hitbox.w * l.hitbox.h);
    expect(area[1]).toBeGreaterThan(area[0] ?? 0);
    expect(area[2]).toBeGreaterThan(area[1] ?? 0);
  });

  it('stronger levels fire a little less often and fly a little slower (owner, 2026-10-18)', () => {
    const [one, two, three] = WEAPON_LEVELS;
    if (!one || !two || !three) throw new Error('three levels expected');
    const rate = (l: { fireInterval: number }): number => 1 / l.fireInterval;
    expect(rate(one)).toBeCloseTo(5);
    expect(rate(two) / rate(one)).toBeCloseTo(0.95);
    expect(rate(three) / rate(one)).toBeCloseTo(0.9);
    expect(two.speed).toBeCloseTo(320 * 0.95);
    expect(three.speed).toBeCloseTo(300 * 0.9);
    expect(two.speed).toBeLessThan(one.speed);
    expect(three.speed).toBeLessThan(two.speed);
  });

  it('shots are drawn 40% smaller, with hitboxes to match (owner, 2026-10-18)', () => {
    expect(WEAPON.shotScale).toBe(0.6);
    const before = [
      { w: 6, h: 12 },
      { w: 12, h: 28 },
      { w: 18, h: 32 },
    ];
    WEAPON_LEVELS.forEach((l, i) => {
      const old = before[i];
      if (!old) throw new Error('missing level');
      expect(Math.abs(l.hitbox.w - old.w * 0.6)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(l.hitbox.h - old.h * 0.6)).toBeLessThanOrEqual(0.5);
    });
  });

  it('level 3 spreads left and right, level 1 fires straight', () => {
    expect(WEAPON_LEVELS[0]?.shots).toEqual([{ dx: 0, angleDeg: 0 }]);
    const angles = WEAPON_LEVELS[2]?.shots.map((s) => s.angleDeg) ?? [];
    expect(Math.min(...angles)).toBeLessThan(0);
    expect(Math.max(...angles)).toBeGreaterThan(0);
  });
});
