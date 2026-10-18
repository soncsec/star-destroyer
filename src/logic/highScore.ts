/**
 * The high score (M7.2). Plain TypeScript, no Phaser (ADR-006).
 *
 * It is the only thing the game stores in the browser (CLAUDE.md: no personal
 * data). The storage is passed in, so these rules are tested without a
 * browser; every call is wrapped, because storage can be missing or refuse
 * (private windows, blocked site data, a full quota), and the game must play
 * on regardless. What comes back is checked: anything but plain digits counts
 * as no high score. Runs that used a cheat never set one (owner, 2026-10-17).
 */

/** The parts of `Storage` the high score uses. */
export type ScoreStore = Pick<Storage, 'getItem' | 'setItem'>;

/** Longest stored value accepted (well beyond any real score). */
const MAX_DIGITS = 9;

/** The stored value as a score: plain digits only, otherwise 0. */
export function parseHighScore(raw: string | null): number {
  if (raw === null || !new RegExp(`^\\d{1,${MAX_DIGITS}}$`).test(raw)) return 0;
  return Number(raw);
}

/** The saved high score, or 0 if there is none or storage can't be read. */
export function loadHighScore(store: ScoreStore | null, key: string): number {
  if (!store) return 0;
  try {
    return parseHighScore(store.getItem(key));
  } catch {
    return 0;
  }
}

/** Saves `score`; false if storage refused (the game carries on either way). */
export function saveHighScore(store: ScoreStore | null, key: string, score: number): boolean {
  if (!store || !Number.isSafeInteger(score) || score < 0) return false;
  try {
    store.setItem(key, String(score));
    return true;
  } catch {
    return false;
  }
}

/** Whether a finished run sets a new high score: a higher score, without cheats. */
export const isNewHighScore = (score: number, best: number, cheated: boolean): boolean =>
  !cheated && score > best;
