/**
 * Level 8, The Core (PROJECT.md 4a level plan): a mix of every enemy type over
 * the top-down nebula at night (level 1's layers, darkened and tinted blue),
 * ending with the multi-part final boss (M6.5). Its difficulty numbers come
 * from `difficulty(8)`, the hardest allowed by PROJECT.md 4a.
 */
import type { SpawnKind } from '../config/tuning';
import { column, line, script, vee } from '../logic/waves';
import type { Level } from './types';

export const LEVEL_8: Level = {
  number: 8,
  name: 'The Core',
  background: [
    { texture: 'bg-stage-back', scrollSpeed: 12, alpha: 1, tint: 0x4a5a9a },
    { texture: 'bg-blue-stars', scrollSpeed: 32, alpha: 0.9 },
  ],
  // M7.4: a dark eclipse hangs over the core.
  props: [{ texture: 'bg-eclipse-2', x: 0.75, y: 40, scrollSpeed: 5, gap: 260 }],
  roster: ['grunt', 'weaver', 'diver', 'flyer', 'eye', 'skull'],
  waves: script<SpawnKind>(
    line(0, 'flyer', [0.35, 0.65]),
    line(2, 'eye', [0.2, 0.5, 0.8]),
    line(4, 'skull', [0.5]),
    vee(6, 'grunt', 0.5, 3, 0.25, 0.4),
    column(8, 'weaver', 0.3, 3, 0.9),
    column(8, 'weaver', 0.7, 3, 0.9),
    line(12, 'diver', [0.25, 0.75]),
    line(13, 'asteroid', [0.5]),
    line(14, 'flyer', [0.3, 0.7]),
    line(16, 'skull', [0.35, 0.65]),
    vee(18, 'eye', 0.5, 3, 0.25, 0.4),
    line(20, 'grunt', [0.2, 0.4, 0.6, 0.8]),
    line(22, 'diver', [0.5]),
    line(23, 'flyer', [0.3, 0.7]),
    column(25, 'eye', 0.5, 4, 0.6),
    line(28, 'skull', [0.2, 0.8]),
    line(29, 'asteroid', [0.35]),
    vee(31, 'weaver', 0.5, 3, 0.25, 0.5),
    line(33, 'diver', [0.3, 0.7]),
    line(35, 'flyer', [0.5]),
    line(36, 'grunt', [0.25, 0.5, 0.75]),
    line(38, 'skull', [0.4, 0.6]),
    line(40, 'eye', [0.2, 0.4, 0.6, 0.8]),
    line(42, 'flyer', [0.3, 0.7]),
    line(44, 'diver', [0.2, 0.5, 0.8]),
    line(46, 'skull', [0.5]),
  ),
  boss: 'final-boss',
  bossAfter: 5,
};
