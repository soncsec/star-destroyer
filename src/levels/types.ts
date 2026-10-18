/**
 * The level format (M4.1, ADR-012). Each level is plain data; one shared game
 * scene plays any level. Difficulty numbers (fire rates, speeds, drop rates)
 * come from `difficulty(level)` (M4.2), not from here, so their limits are
 * checked in one place.
 */
import type { BossKind, EnemyKind, SpawnKind } from '../config/tuning';
import type { WaveSpawn } from '../logic/waves';

/** One scrolling background layer, drawn in list order (first = furthest back). */
export interface BackgroundLayer {
  /** Texture key from the asset manifest. */
  texture: string;
  /** Pixels per second; nearer layers move faster for depth. */
  scrollSpeed: number;
  /** 1 = opaque. */
  alpha: number;
}

export interface Level {
  /** 1-based; level 8 is the last. */
  number: number;
  /** What the player sees, e.g. on the level-complete screen. */
  name: string;
  background: readonly BackgroundLayer[];
  /** The enemy types this level uses (the approved plan). */
  roster: readonly EnemyKind[];
  /** Enemies and asteroids, in time order (seconds from the level start). */
  waves: readonly WaveSpawn<SpawnKind>[];
  boss: BossKind;
  /** Seconds of quiet after the last wave before the boss comes in. */
  bossAfter: number;
}
