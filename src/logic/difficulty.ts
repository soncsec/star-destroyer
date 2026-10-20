/**
 * The difficulty curve (M4.2, ADR-012). Plain TypeScript, no Phaser (ADR-006).
 *
 * Every difficulty number comes from here, worked out from the level-1 base
 * numbers, so the limits in PROJECT.md 4a are checked in one place:
 * - enemies fire more often each level, by the same percentage each time,
 *   reaching at most 2.5× the level-1 rate at the last level;
 * - enemy shots get faster, at most 30% faster by the last level;
 * - weapon and shield gems drop slightly more often later, while the screen
 *   clear and the health gem stay exactly as rare as in level 1.
 */
import type { DropRules } from './drops';
import type { EnemyFireRules } from './enemyFire';

export interface DifficultyBase {
  /** Level-1 enemy fire timing. */
  fire: EnemyFireRules;
  /** Level-1 enemy shot speed, pixels per second. */
  shotSpeed: number;
  /** Level-1 drop rules. */
  drops: DropRules;
}

export interface DifficultyCurve {
  /** The last level (8). */
  lastLevel: number;
  /** Fire rate at the last level, as a multiple of level 1's (limit: 2.5). */
  fireRateAtLast: number;
  /** Shot speed at the last level, as a multiple of level 1's (limit: 1.3). */
  shotSpeedAtLast: number;
  /** How much more often weapon and shield gems drop at the last level (1.25 = 25%). */
  helpfulDropsAtLast: number;
}

export interface Difficulty {
  fire: EnemyFireRules;
  shotSpeed: number;
  drops: DropRules;
}

/** The difficulty numbers for `level` (1 to the last level). */
export function difficulty(
  level: number,
  base: DifficultyBase,
  curve: DifficultyCurve,
): Difficulty {
  if (!Number.isInteger(level) || level < 1 || level > curve.lastLevel) {
    throw new RangeError(`level must be a whole number from 1 to ${curve.lastLevel}`);
  }
  // 0 at level 1, 1 at the last level.
  const p = curve.lastLevel > 1 ? (level - 1) / (curve.lastLevel - 1) : 0;

  // Same percentage step every level: rate × fireRateAtLast^p.
  const rate = curve.fireRateAtLast ** p;
  const fire = {
    ...base.fire,
    interval: base.fire.interval / rate,
    jitter: base.fire.jitter / rate,
  };

  const shotSpeed = base.shotSpeed * (1 + (curve.shotSpeedAtLast - 1) * p);

  // Weapon and shield weights grow; the overall chance grows with them so the
  // screen clear's and health gem's own chances per kill stay the same.
  const boost = 1 + (curve.helpfulDropsAtLast - 1) * p;
  const w = base.drops.weights;
  const weights = { ...w, weapon: w.weapon * boost, shield: w.shield * boost };
  const total = (r: typeof w): number => r.weapon + r.shield + r.clear + r.health;
  const drops = { chance: base.drops.chance * (total(weights) / total(w)), weights };

  return { fire, shotSpeed, drops };
}
