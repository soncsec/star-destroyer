/** Every level, in play order (M4.1). Levels 4–8 arrive in M5–M6. */
import { LEVEL_1 } from './level1';
import { LEVEL_2 } from './level2';
import { LEVEL_3 } from './level3';
import type { Level } from './types';

export const LEVELS: readonly Level[] = [LEVEL_1, LEVEL_2, LEVEL_3];
