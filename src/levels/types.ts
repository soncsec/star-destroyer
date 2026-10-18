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
  /**
   * Pixels per second; nearer layers move faster for depth. 0 keeps a layer
   * still (for art that doesn't repeat cleanly); only the back layer may.
   */
  scrollSpeed: number;
  /** 1 = opaque. */
  alpha: number;
  /**
   * Whole-number zoom for art narrower than the screen (2 draws each pixel
   * 2×2, so a 160-wide tile covers the 256-wide screen without a seam).
   * Default 1.
   */
  scale?: 1 | 2;
}

/** A single image (a planet, say) drifting down behind the action and coming round again. */
export interface BackgroundProp {
  /** Texture key of an image in the asset manifest. */
  texture: string;
  /** Horizontal center as a fraction of the screen width. */
  x: number;
  /** Center y at the level's start, in pixels (negative = above the screen). */
  y: number;
  /** Pixels per second. */
  scrollSpeed: number;
  /** Pixels of empty sky after it leaves the bottom before it comes back at the top. */
  gap: number;
}

export interface Level {
  /** 1-based; level 8 is the last. */
  number: number;
  /** What the player sees, e.g. on the level-complete screen. */
  name: string;
  background: readonly BackgroundLayer[];
  /** Drawn over the background layers, behind everything else. */
  props?: readonly BackgroundProp[];
  /** The enemy types this level uses (the approved plan). */
  roster: readonly EnemyKind[];
  /** Enemies and asteroids, in time order (seconds from the level start). */
  waves: readonly WaveSpawn<SpawnKind>[];
  boss: BossKind;
  /** Seconds of quiet after the last wave before the boss comes in. */
  bossAfter: number;
}
