/**
 * Level 6, Demon Rift (PROJECT.md 4a level plan): flying-eye demons and fire
 * skulls over the red planet pack with its layers darkened, and the fire
 * skull in flames as its boss (M6.3). Its difficulty numbers come from
 * `difficulty(6)`.
 */
import type { SpawnKind } from '../config/tuning';
import { column, line, script, vee } from '../logic/waves';
import type { Level } from './types';

export const LEVEL_6: Level = {
  number: 6,
  name: 'Demon Rift',
  background: [
    // Level 4's red sky, still at 2× (it doesn't repeat cleanly), but darker.
    { texture: 'bg-red-back', scrollSpeed: 0, alpha: 1, scale: 2, tint: 0x6a4a5a },
    { texture: 'bg-red-far-planets', scrollSpeed: 8, alpha: 1, scale: 2, tint: 0x806070 },
    { texture: 'bg-red-stars', scrollSpeed: 32, alpha: 0.8 },
  ],
  roster: ['eye', 'skull'],
  waves: script<SpawnKind>(
    line(0, 'eye', [0.3, 0.5, 0.7]),
    line(3, 'skull', [0.5]),
    vee(5, 'eye', 0.5, 3, 0.25, 0.4),
    line(8, 'skull', [0.25, 0.75]),
    column(10, 'eye', 0.3, 3, 0.8),
    column(10, 'eye', 0.7, 3, 0.8),
    line(14, 'skull', [0.5]),
    line(15, 'asteroid', [0.2]),
    line(17, 'eye', [0.2, 0.4, 0.6, 0.8]),
    line(19, 'skull', [0.35, 0.65]),
    vee(22, 'eye', 0.5, 3, 0.3, 0.4),
    line(24, 'skull', [0.2, 0.8]),
    line(26, 'eye', [0.3, 0.5, 0.7]),
    line(28, 'skull', [0.5]),
    column(30, 'eye', 0.5, 4, 0.7),
    line(33, 'asteroid', [0.75]),
    line(34, 'skull', [0.3, 0.7]),
    line(36, 'eye', [0.25, 0.5, 0.75]),
    line(38, 'skull', [0.4, 0.6]),
    vee(40, 'eye', 0.5, 3, 0.25, 0.4),
    line(43, 'skull', [0.25, 0.5, 0.75]),
  ),
  boss: 'fire-skull',
  bossAfter: 4,
};
