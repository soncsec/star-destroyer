/**
 * Level 7, Deep Dark (PROJECT.md 4a level plan): a mix of every enemy type
 * over nothing but stars, from the blue space pack, and twin Warped vehicle 1s
 * as its boss (M6.4). Its difficulty numbers come from `difficulty(7)`.
 */
import type { SpawnKind } from '../config/tuning';
import { column, line, script, vee } from '../logic/waves';
import type { Level } from './types';

export const LEVEL_7: Level = {
  number: 7,
  name: 'Deep Dark',
  background: [
    // Stars only: a dim, slow far field and a brighter, faster near one.
    { texture: 'bg-blue-stars', scrollSpeed: 8, alpha: 1, tint: 0x7080a0 },
    { texture: 'bg-blue-stars', scrollSpeed: 34, alpha: 0.9, scale: 2 },
  ],
  roster: ['grunt', 'weaver', 'diver', 'flyer', 'eye', 'skull'],
  waves: script<SpawnKind>(
    line(0, 'grunt', [0.3, 0.5, 0.7]),
    line(2, 'eye', [0.2, 0.8]),
    line(4, 'diver', [0.5]),
    vee(6, 'weaver', 0.5, 3, 0.25, 0.4),
    line(8, 'flyer', [0.35, 0.65]),
    line(10, 'skull', [0.2, 0.8]),
    column(12, 'eye', 0.5, 3, 0.7),
    line(14, 'grunt', [0.25, 0.75]),
    line(15, 'asteroid', [0.6]),
    line(16, 'diver', [0.3, 0.7]),
    line(18, 'flyer', [0.5]),
    vee(20, 'grunt', 0.5, 3, 0.25, 0.4),
    line(22, 'skull', [0.35, 0.65]),
    column(24, 'weaver', 0.3, 3, 0.9),
    column(24, 'weaver', 0.7, 3, 0.9),
    line(28, 'eye', [0.2, 0.4, 0.6, 0.8]),
    line(30, 'flyer', [0.3, 0.7]),
    line(32, 'diver', [0.2, 0.5, 0.8]),
    line(34, 'asteroid', [0.3]),
    line(35, 'skull', [0.5]),
    vee(37, 'eye', 0.5, 3, 0.25, 0.4),
    line(39, 'grunt', [0.2, 0.4, 0.6, 0.8]),
    line(41, 'flyer', [0.35, 0.65]),
    line(43, 'skull', [0.25, 0.75]),
    line(45, 'weaver', [0.3, 0.5, 0.7]),
  ),
  boss: 'twin-vehicle-1',
  bossAfter: 4,
};
