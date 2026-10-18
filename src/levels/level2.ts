/**
 * Level 2, Asteroid Belt (PROJECT.md 4a level plan): grunts and divers, heavy
 * asteroids over the purple asteroid field, and Warped vehicle 1 as its boss
 * (M5.2). Its difficulty numbers come from `difficulty(2)`.
 */
import type { SpawnKind } from '../config/tuning';
import { column, line, script, vee } from '../logic/waves';
import type { Level } from './types';

export const LEVEL_2: Level = {
  number: 2,
  name: 'Asteroid Belt',
  background: [
    // The field is 160 wide: drawn 2× it covers the 256-wide screen in one piece.
    { texture: 'bg-asteroid-field', scrollSpeed: 7, alpha: 1, scale: 2 },
    { texture: 'bg-blue-stars', scrollSpeed: 36, alpha: 0.6 },
  ],
  roster: ['grunt', 'diver'],
  waves: script<SpawnKind>(
    line(0, 'grunt', [0.25, 0.5, 0.75]),
    line(2, 'asteroid', [0.2]),
    line(4, 'diver', [0.5]),
    line(6, 'asteroid', [0.75]),
    vee(8, 'grunt', 0.5, 5, 0.15, 0.4),
    line(11, 'diver', [0.3, 0.7]),
    line(12, 'asteroid', [0.5]),
    column(15, 'grunt', 0.2, 3, 0.8),
    column(15, 'grunt', 0.8, 3, 0.8),
    line(18, 'asteroid', [0.3]),
    line(19, 'diver', [0.6]),
    line(21, 'asteroid', [0.8]),
    line(23, 'grunt', [0.15, 0.35, 0.65, 0.85]),
    line(25, 'diver', [0.5]),
    line(27, 'asteroid', [0.2]),
    line(28, 'asteroid', [0.7]),
    vee(31, 'grunt', 0.5, 5, 0.15, 0.4),
    line(33, 'diver', [0.25, 0.75]),
    line(35, 'asteroid', [0.45]),
    line(37, 'grunt', [0.2, 0.4, 0.6, 0.8]),
    line(39, 'diver', [0.5]),
    line(41, 'asteroid', [0.25]),
    line(42, 'asteroid', [0.75]),
  ),
  boss: 'vehicle-1',
  bossAfter: 4,
};
