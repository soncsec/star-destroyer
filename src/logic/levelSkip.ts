/**
 * Play-test level skip (owner decision 2026-10-18, PROJECT.md 4b): opening the
 * game with `?level=n` starts at level n, on every build, so late levels can be
 * play-tested on any device, phones included. It counts as a cheat: a run that
 * skipped can't set the high score. Plain TypeScript, no Phaser.
 */

/**
 * The level a page URL's query asks for, or null if it asks for none or for
 * one that doesn't exist. Only a plain number from 1 to `count` is accepted;
 * anything else (letters, signs, decimals, an empty value) is ignored.
 */
export function requestedLevel(search: string, count: number): number | null {
  const value = new URLSearchParams(search).get('level');
  if (value === null || !/^[1-9]\d?$/.test(value)) return null;
  const level = Number(value);
  return level <= count ? level : null;
}
