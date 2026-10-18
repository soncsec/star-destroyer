import { describe, expect, it } from 'vitest';
import { CHEATS } from '../../src/config/tuning';
import { checkWords, typeLetter } from '../../src/logic/cheats';

const words = { lives: 'LIVELONG', invincible: 'IRONBELT' } as const;
const type = (text: string) => {
  let buffer = '';
  const fired: string[] = [];
  for (const c of text) {
    const r = typeLetter(buffer, c, words);
    buffer = r.buffer;
    if (r.cheat) fired.push(r.cheat);
  }
  return fired;
};

describe('typeLetter', () => {
  it('fires a cheat when its word is typed', () => {
    expect(type('LIVELONG')).toEqual(['lives']);
    expect(type('IRONBELT')).toEqual(['invincible']);
  });
  it('finds the word after other letters', () => {
    expect(type('XYZLIVELONG')).toEqual(['lives']);
  });
  it('fires again each time the word is typed', () => {
    expect(type('LIVELONGLIVELONG')).toEqual(['lives', 'lives']);
  });
  it('a non-letter key breaks the word', () => {
    let buffer = '';
    for (const c of 'LIVE') buffer = typeLetter(buffer, c, words).buffer;
    buffer = typeLetter(buffer, 'ArrowLeft', words).buffer;
    let fired = null;
    for (const c of 'LONG') fired = typeLetter(buffer, c, words).cheat ?? fired;
    expect(fired).toBeNull();
  });
  it('a near miss does nothing', () => {
    expect(type('LIVELONE')).toEqual([]);
  });
});

describe('the cheat words in use', () => {
  it('are valid and never contain a hotkey letter', () => {
    expect(checkWords(CHEATS.words)).toEqual([]);
  });
  it('checkWords catches short words and hotkey letters', () => {
    expect(checkWords({ lives: 'ABC', invincible: 'SHIELDME' })).toEqual([
      'lives: use 5 or more capital letters',
      'lives: contains hotkey letters A',
      'invincible: contains hotkey letters SHDM',
    ]);
  });
});
