/**
 * Level 3, Blue Expanse (PROJECT.md 4a level plan): weavers, divers and the
 * alien flyers over the layered blue space pack, with Warped vehicle 2 as its
 * boss (M5.3). Its difficulty numbers come from `difficulty(3)`.
 */
import type { SpawnKind } from '../config/tuning';
import { column, line, script, vee } from '../logic/waves';
import type { Level } from './types';

export const LEVEL_3: Level = {
  number: 3,
  name: 'Blue Expanse',
  background: [
    { texture: 'bg-blue-back', scrollSpeed: 9, alpha: 1 },
    { texture: 'bg-blue-stars', scrollSpeed: 30, alpha: 0.9 },
  ],
  roster: ['weaver', 'diver', 'flyer'],
  waves: script<SpawnKind>(
    line(0, 'weaver', [0.3, 0.5, 0.7]),
    line(3, 'flyer', [0.5]),
    line(6, 'diver', [0.25, 0.75]),
    vee(8, 'weaver', 0.5, 3, 0.2, 0.5),
    line(11, 'flyer', [0.35, 0.65]),
    line(13, 'asteroid', [0.8]),
    line(15, 'diver', [0.5]),
    column(17, 'weaver', 0.3, 3, 1),
    column(17, 'weaver', 0.7, 3, 1),
    line(21, 'flyer', [0.5]),
    line(22, 'diver', [0.2, 0.8]),
    line(25, 'asteroid', [0.25]),
    vee(27, 'weaver', 0.5, 3, 0.25, 0.6),
    line(29, 'flyer', [0.3, 0.7]),
    line(32, 'diver', [0.4, 0.6]),
    line(35, 'weaver', [0.25, 0.5, 0.75]),
    line(37, 'flyer', [0.5]),
    line(39, 'asteroid', [0.7]),
    line(41, 'diver', [0.3, 0.7]),
    line(43, 'flyer', [0.35, 0.65]),
  ),
  boss: 'vehicle-2',
  bossAfter: 4,
};
