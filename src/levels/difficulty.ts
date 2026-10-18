/** The difficulty numbers for each level, from the tuning (M4.2). */
import { DIFFICULTY, ENEMY_FIRE, POWERUPS } from '../config/tuning';
import { difficulty, type Difficulty } from '../logic/difficulty';

export const levelDifficulty = (level: number): Difficulty =>
  difficulty(
    level,
    { fire: ENEMY_FIRE, shotSpeed: ENEMY_FIRE.speed, drops: POWERUPS.drops },
    DIFFICULTY,
  );
