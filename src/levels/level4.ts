/**
 * Level 4, Red Giant (PROJECT.md 4a level plan): alien flyers and divers over
 * the red planet parallax pack, with the big red planet and the ringed planet
 * drifting past, and the upgraded spaceship unit as its boss (M5.4). Its
 * difficulty numbers come from `difficulty(4)`.
 */
import type { SpawnKind } from '../config/tuning';
import { column, line, script, vee } from '../logic/waves';
import type { Level } from './types';

export const LEVEL_4: Level = {
  number: 4,
  name: 'Red Giant',
  background: [
    { texture: 'bg-red-back', scrollSpeed: 5, alpha: 1 },
    { texture: 'bg-red-far-planets', scrollSpeed: 9, alpha: 1 },
    { texture: 'bg-red-stars', scrollSpeed: 28, alpha: 1 },
  ],
  props: [
    { texture: 'bg-red-big-planet', x: 0.7, y: 90, scrollSpeed: 4, gap: 120 },
    { texture: 'bg-red-ring-planet', x: 0.18, y: -200, scrollSpeed: 7, gap: 260 },
  ],
  roster: ['diver', 'flyer'],
  waves: script<SpawnKind>(
    line(0, 'flyer', [0.35, 0.65]),
    line(3, 'diver', [0.5]),
    line(5, 'asteroid', [0.8]),
    line(7, 'flyer', [0.3, 0.5, 0.7]),
    line(10, 'diver', [0.2, 0.8]),
    column(12, 'diver', 0.5, 3, 1.1),
    line(16, 'flyer', [0.4, 0.6]),
    line(18, 'asteroid', [0.25]),
    vee(20, 'diver', 0.5, 3, 0.25, 0.5),
    line(23, 'flyer', [0.3, 0.7]),
    line(25, 'flyer', [0.5]),
    line(27, 'diver', [0.15, 0.85]),
    line(29, 'asteroid', [0.6]),
    line(31, 'flyer', [0.3, 0.5, 0.7]),
    line(34, 'diver', [0.3, 0.7]),
    column(36, 'diver', 0.5, 2, 1),
    line(38, 'flyer', [0.35, 0.65]),
    line(41, 'asteroid', [0.3]),
    line(42, 'diver', [0.2, 0.5, 0.8]),
    line(44, 'flyer', [0.4, 0.6]),
  ),
  boss: 'spaceship-unit-mk2',
  bossAfter: 4,
};
