/** Facts about the boss a level ends with, whichever kind it is (M6.5). */
import { BOSSES, FINAL_BOSS, type LevelBossKind } from '../config/tuning';
import { bossTotalHp } from '../logic/boss';
import { finalTotalHp } from '../logic/finalBoss';

/** Health across every ship or part of the boss. */
export function levelBossHp(kind: LevelBossKind): number {
  return kind === 'final-boss' ? finalTotalHp(FINAL_BOSS) : bossTotalHp(BOSSES[kind]);
}
