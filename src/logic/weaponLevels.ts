/**
 * Weapon levels (M3.2, owner request: shots start small and grow bigger and
 * stronger). Plain TypeScript, no Phaser (ADR-006).
 *
 * Each weapon power-up raises the level by one, up to the top level. Levels
 * never time out; losing a life drops the weapon back to level 1.
 */

/** One shot in a volley, relative to the muzzle. 0° is straight up; positive turns right. */
export interface ShotSlot {
  dx: number;
  angleDeg: number;
}

export interface WeaponLevel {
  shots: readonly ShotSlot[];
  damage: number;
  /** Pixels per second. */
  speed: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
}

/** The shots one trigger pull fires from the muzzle at (x, y). */
export function volley(level: WeaponLevel, x: number, y: number): Shot[] {
  if (level.speed <= 0) throw new RangeError('shot speed must be positive');
  return level.shots.map((s) => {
    const rad = (s.angleDeg * Math.PI) / 180;
    return {
      x: x + s.dx,
      y,
      vx: Math.sin(rad) * level.speed,
      vy: -Math.cos(rad) * level.speed,
      damage: level.damage,
    };
  });
}

/** Level after collecting a weapon power-up (1-based, capped at `max`). */
export function levelUp(level: number, max: number): number {
  if (max < 1) throw new RangeError('max level must be at least 1');
  return Math.min(max, Math.max(1, level) + 1);
}

/** Sprite rotation in degrees for a shot moving at (vx, vy), for art that points right. */
export const shotAngle = (vx: number, vy: number): number => (Math.atan2(vy, vx) * 180) / Math.PI;
