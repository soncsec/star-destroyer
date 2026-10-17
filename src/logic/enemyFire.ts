/**
 * Enemy shooting rules (M2.2). Plain TypeScript, no Phaser (ADR-006).
 *
 * Each enemy fires on its own timer, randomised with the seeded RNG so a wave
 * doesn't fire in unison. Shots aim at the player but never more than
 * `maxAngleDeg` away from straight down, so there is always room to dodge
 * (PROJECT.md 4a: every attack leaves a gap).
 */
import type { Rng } from './rng';

export interface EnemyFireRules {
  /** Average seconds between one enemy's shots. */
  interval: number;
  /** Each gap is interval ± jitter seconds. */
  jitter: number;
  /** Earliest first shot after an enemy appears, in seconds. */
  firstShotMin: number;
}

/** Seconds until an enemy's next shot: interval ± jitter, never below `floor`. */
export function nextShotDelay(rng: Rng, rules: EnemyFireRules, floor = 0.1): number {
  if (rules.interval <= 0) throw new RangeError('interval must be positive');
  if (rules.jitter < 0 || rules.jitter >= rules.interval) {
    throw new RangeError('jitter must be at least 0 and less than the interval');
  }
  return Math.max(floor, rng.range(rules.interval - rules.jitter, rules.interval + rules.jitter));
}

/** Delay before a new enemy's first shot. */
export function firstShotDelay(rng: Rng, rules: EnemyFireRules): number {
  return nextShotDelay(rng, rules, rules.firstShotMin);
}

/**
 * Advances one enemy's shot timer. It only counts down (and fires) while the
 * enemy is fully on screen, so enemies never shoot from off screen.
 */
export function stepEnemyFire(
  timeLeft: number,
  dt: number,
  onScreen: boolean,
  next: () => number,
): { timeLeft: number; fire: boolean } {
  if (dt < 0) throw new RangeError('dt must not be negative');
  if (!onScreen) return { timeLeft, fire: false };
  const left = timeLeft - dt;
  return left > 0 ? { timeLeft: left, fire: false } : { timeLeft: next(), fire: true };
}

export interface Vec {
  x: number;
  y: number;
}

/**
 * Velocity for a shot from `from` toward `to` at `speed`, turned no more than
 * `maxAngleDeg` away from straight down (+y). A target above the shooter gets
 * a shot straight down.
 */
export function aimDown(from: Vec, to: Vec, speed: number, maxAngleDeg: number): Vec {
  if (speed <= 0) throw new RangeError('speed must be positive');
  if (maxAngleDeg < 0 || maxAngleDeg >= 90) throw new RangeError('maxAngleDeg must be 0 to 89');
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dy <= 0) return { x: 0, y: speed };
  const max = (maxAngleDeg * Math.PI) / 180;
  const angle = Math.max(-max, Math.min(max, Math.atan2(dx, dy)));
  return { x: Math.sin(angle) * speed, y: Math.cos(angle) * speed };
}
