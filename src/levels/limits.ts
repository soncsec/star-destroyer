/**
 * Limits every level's wave data must respect, worked out from the tuning
 * (no Phaser, so level data can be checked in unit tests).
 */
import { ASSETS } from '../assets/manifest';
import {
  ASTEROIDS,
  ENEMY_COMMON,
  ENEMY_TYPES,
  GAME_HEIGHT,
  GAME_WIDTH,
  type EnemyKind,
} from '../config/tuning';
import { spawnMargin, type MovePattern } from '../logic/enemyMoves';
import type { WaveLimits } from '../logic/waves';

/** The standard enemy frame height; they spawn just above the screen. */
const FRAME = 48;

/**
 * Rough seconds an enemy of this pattern spends on screen if nobody shoots it,
 * for a sprite `frame` pixels tall.
 */
export function screenTime(move: MovePattern, frame = FRAME): number {
  const path = GAME_HEIGHT + frame;
  switch (move.kind) {
    case 'straight':
    case 'weave':
      return path / move.speed;
    case 'dive':
      return (move.hoverY + frame / 2) / move.enterSpeed + move.hoverTime + path / move.diveSpeed;
  }
}

const kinds = Object.keys(ENEMY_TYPES) as EnemyKind[];

/** A sprite sheet's frame height, from the asset manifest. */
export function sheetFrameHeight(sprite: string): number {
  const asset = ASSETS.find((a) => a.key === sprite);
  if (asset?.kind !== 'sheet') throw new Error(`no sprite sheet called ${sprite}`);
  return asset.frameHeight;
}

/** An enemy kind's frame height. */
export const frameHeight = (kind: EnemyKind): number => sheetFrameHeight(ENEMY_TYPES[kind].sprite);

const asteroidMargin = (ASTEROIDS.large.hitbox.w / 2 + 4) / GAME_WIDTH;
/** A large rock's time on screen at its drift speed (it spawns with its full height above). */
export const ASTEROID_SCREEN_TIME = (GAME_HEIGHT + 63) / ASTEROIDS.large.speed;

/** Limits for enemies; asteroids are allowed in the script but counted separately. */
export const WAVE_LIMITS: WaveLimits = {
  xRange: {
    ...Object.fromEntries(
      kinds.map((k) => {
        const t = ENEMY_TYPES[k];
        const margin = spawnMargin(t.move, t.hitbox.w / 2) / GAME_WIDTH;
        return [k, { min: margin, max: 1 - margin }];
      }),
    ),
    asteroid: { min: asteroidMargin, max: 1 - asteroidMargin },
  },
  screenTime: {
    ...Object.fromEntries(kinds.map((k) => [k, screenTime(ENEMY_TYPES[k].move, frameHeight(k))])),
    asteroid: ASTEROID_SCREEN_TIME,
  },
  maxAtOnce: ENEMY_COMMON.poolSize,
  crowdKinds: kinds,
};

/** Large asteroids on screen at once must fit their own pool. */
export const ASTEROID_LIMITS: WaveLimits = {
  xRange: WAVE_LIMITS.xRange,
  screenTime: WAVE_LIMITS.screenTime,
  maxAtOnce: ASTEROIDS.poolLarge,
  crowdKinds: ['asteroid'],
};
