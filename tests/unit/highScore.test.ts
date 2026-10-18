import { describe, expect, it } from 'vitest';
import {
  isNewHighScore,
  loadHighScore,
  parseHighScore,
  saveHighScore,
  type ScoreStore,
} from '../../src/logic/highScore';

const KEY = 'test.highScore';

/** An in-memory stand-in for localStorage. */
function memory(
  initial: Record<string, string> = {},
): ScoreStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

/** Storage that refuses everything, as in a locked-down browser. */
const refusing: ScoreStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('high score (M7.2)', () => {
  it('reads plain digits as the score, and anything else as none', () => {
    expect(parseHighScore('12500')).toBe(12500);
    expect(parseHighScore('0')).toBe(0);
    for (const bad of [
      null,
      '',
      '-5',
      '1e9',
      '12.5',
      ' 12',
      '0x10',
      '1234567890',
      'NaN',
      '<b>9</b>',
    ])
      expect(parseHighScore(bad), String(bad)).toBe(0);
  });

  it('saves and loads through the storage it is given', () => {
    const store = memory();
    expect(loadHighScore(store, KEY)).toBe(0);
    expect(saveHighScore(store, KEY, 4200)).toBe(true);
    expect(store.data).toEqual({ [KEY]: '4200' });
    expect(loadHighScore(store, KEY)).toBe(4200);
  });

  it('ignores a tampered value', () => {
    expect(loadHighScore(memory({ [KEY]: 'alert(1)' }), KEY)).toBe(0);
  });

  it('plays on without storage, or when storage refuses', () => {
    expect(loadHighScore(null, KEY)).toBe(0);
    expect(saveHighScore(null, KEY, 10)).toBe(false);
    expect(loadHighScore(refusing, KEY)).toBe(0);
    expect(saveHighScore(refusing, KEY, 10)).toBe(false);
  });

  it('only stores whole, non-negative scores', () => {
    const store = memory();
    expect(saveHighScore(store, KEY, -1)).toBe(false);
    expect(saveHighScore(store, KEY, 1.5)).toBe(false);
    expect(saveHighScore(store, KEY, Number.NaN)).toBe(false);
    expect(store.data).toEqual({});
  });

  it('a run sets a new high score only by beating it, and never with cheats', () => {
    expect(isNewHighScore(500, 400, false)).toBe(true);
    expect(isNewHighScore(400, 400, false)).toBe(false);
    expect(isNewHighScore(300, 400, false)).toBe(false);
    expect(isNewHighScore(500, 400, true)).toBe(false);
    expect(isNewHighScore(1, 0, false)).toBe(true);
  });
});
