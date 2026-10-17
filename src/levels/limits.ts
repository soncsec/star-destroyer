/**
 * Limits every level's wave data must respect, worked out from the tuning
 * (no Phaser, so level data can be checked in unit tests).
 */
import {
  ENEMY_COMMON,
  ENEMY_TYPES,
  GAME_HEIGHT,
  GAME_WIDTH,
  type EnemyKind,
} from '../config/tuning';
import { spawnMargin, type MovePattern } from '../logic/enemyMoves';
import type { WaveLimits } from '../logic/waves';

/** Height of every enemy frame; they spawn just above the screen. */
const FRAME = 48;

/** Rough seconds an enemy of this pattern spends on screen if nobody shoots it. */
export function screenTime(move: MovePattern): number {
  const path = GAME_HEIGHT + FRAME;
  switch (move.kind) {
    case 'straight':
    case 'weave':
      return path / move.speed;
    case 'dive':
      return (move.hoverY + FRAME / 2) / move.enterSpeed + move.hoverTime + path / move.diveSpeed;
  }
}

const kinds = Object.keys(ENEMY_TYPES) as EnemyKind[];

export const WAVE_LIMITS: WaveLimits = {
  xRange: Object.fromEntries(
    kinds.map((k) => {
      const t = ENEMY_TYPES[k];
      const margin = spawnMargin(t.move, t.hitbox.w / 2) / GAME_WIDTH;
      return [k, { min: margin, max: 1 - margin }];
    }),
  ),
  screenTime: Object.fromEntries(kinds.map((k) => [k, screenTime(ENEMY_TYPES[k].move)])),
  maxAtOnce: ENEMY_COMMON.poolSize,
};
