import type { ScoreStore } from '../logic/highScore';

/**
 * The browser's localStorage, or null where it can't be used: merely reading
 * `window.localStorage` throws in some locked-down browsers.
 */
export function browserStore(): ScoreStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
