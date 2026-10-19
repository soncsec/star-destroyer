/**
 * Level 1, Teal Nebula: grunts and weavers (PROJECT.md 4a level plan), plus a
 * few large asteroids that split when shot (M2.5), then the spaceship-unit boss.
 */
import type { SpawnKind } from '../config/tuning';
import { column, line, script, vee } from '../logic/waves';
import type { Level } from './types';

export const LEVEL_1: Level = {
  number: 1,
  name: 'Teal Nebula',
  background: [
    { texture: 'bg-stage-back', scrollSpeed: 10, alpha: 1 },
    { texture: 'bg-blue-stars', scrollSpeed: 28, alpha: 0.8 },
  ],
  // M7.4: a blue planet and an eclipse drift past behind the action.
  props: [
    { texture: 'bg-planet', x: 0.78, y: 60, scrollSpeed: 5, gap: 200 },
    { texture: 'bg-eclipse-1', x: 0.2, y: -160, scrollSpeed: 7, gap: 300 },
  ],
  roster: ['grunt', 'weaver'],
  waves: script<SpawnKind>(
    line(0, 'grunt', [0.3, 0.5, 0.7]),
    line(4, 'weaver', [0.5]),
    vee(7, 'grunt', 0.5, 5, 0.15, 0.5),
    line(10, 'asteroid', [0.8]),
    line(12, 'weaver', [0.3, 0.7]),
    column(15, 'grunt', 0.2, 3, 0.8),
    column(15, 'grunt', 0.8, 3, 0.8),
    line(20, 'weaver', [0.25, 0.5, 0.75]),
    vee(24, 'grunt', 0.5, 5, 0.15, 0.4),
    line(28, 'grunt', [0.15, 0.85]),
    line(28.5, 'weaver', [0.5]),
    line(30, 'asteroid', [0.25]),
    column(32, 'weaver', 0.35, 3, 1.2),
    line(37, 'grunt', [0.2, 0.4, 0.6, 0.8]),
    line(39, 'asteroid', [0.65]),
    vee(41, 'weaver', 0.5, 3, 0.25, 0.8),
  ),
  boss: 'spaceship-unit',
  bossAfter: 4,
};
