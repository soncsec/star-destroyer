/** Every level, in play order (M4.1). Level 2 is an early version (M4.4); levels 3–8 arrive in M5–M7. */
import { LEVEL_1 } from './level1';
import { LEVEL_2 } from './level2';
import type { Level } from './types';

export const LEVELS: readonly Level[] = [LEVEL_1, LEVEL_2];
