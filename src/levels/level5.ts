/**
 * Level 5, Station Run (PROJECT.md 4a level plan): enemy types 1–3 (grunts,
 * weavers and divers) down the Zone 202 corridor, turned into a vertical
 * tunnel, with Warped vehicle 3 as its boss (M6.2). No asteroids inside the
 * station. Its difficulty numbers come from `difficulty(5)`.
 */
import type { SpawnKind } from '../config/tuning';
import { column, line, script, vee } from '../logic/waves';
import type { Level } from './types';

export const LEVEL_5: Level = {
  number: 5,
  name: 'Station Run',
  background: [{ texture: 'bg-station-tunnel', scrollSpeed: 40, alpha: 1 }],
  roster: ['grunt', 'weaver', 'diver'],
  waves: script<SpawnKind>(
    line(0, 'grunt', [0.35, 0.5, 0.65]),
    line(2, 'weaver', [0.5]),
    line(4, 'diver', [0.3, 0.7]),
    vee(6, 'grunt', 0.5, 3, 0.2, 0.4),
    column(9, 'weaver', 0.3, 3, 1),
    column(9, 'weaver', 0.7, 3, 1),
    line(13, 'diver', [0.5]),
    line(14, 'grunt', [0.2, 0.8]),
    line(16, 'diver', [0.25, 0.75]),
    vee(18, 'weaver', 0.5, 3, 0.25, 0.5),
    line(21, 'grunt', [0.3, 0.5, 0.7]),
    line(23, 'diver', [0.4, 0.6]),
    column(25, 'grunt', 0.5, 3, 0.8),
    line(28, 'weaver', [0.3, 0.7]),
    line(30, 'diver', [0.2, 0.5, 0.8]),
    vee(32, 'grunt', 0.5, 3, 0.25, 0.4),
    line(35, 'weaver', [0.25, 0.5, 0.75]),
    line(37, 'diver', [0.35, 0.65]),
    line(39, 'grunt', [0.2, 0.4, 0.6, 0.8]),
    line(42, 'weaver', [0.4, 0.6]),
    line(44, 'diver', [0.5]),
  ),
  boss: 'vehicle-3',
  bossAfter: 4,
};
