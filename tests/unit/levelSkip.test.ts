import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/levels';
import { requestedLevel } from '../../src/logic/levelSkip';

describe('requestedLevel (M7.9)', () => {
  it('reads ?level=n for an existing level', () => {
    expect(requestedLevel('?level=1', 8)).toBe(1);
    expect(requestedLevel('?level=8', 8)).toBe(8);
    expect(requestedLevel('?seed=42&level=3', 8)).toBe(3);
  });

  it('asks for nothing when there is no level parameter', () => {
    expect(requestedLevel('', 8)).toBeNull();
    expect(requestedLevel('?seed=42', 8)).toBeNull();
    expect(requestedLevel('?level=', 8)).toBeNull();
  });

  it('ignores levels that do not exist', () => {
    expect(requestedLevel('?level=0', 8)).toBeNull();
    expect(requestedLevel('?level=9', 8)).toBeNull();
    expect(requestedLevel('?level=99', 8)).toBeNull();
    expect(requestedLevel('?level=100', 8)).toBeNull();
  });

  it('ignores anything that is not a plain level number', () => {
    for (const bad of ['abc', '-1', '+2', '2.5', '1e1', ' 3', '3 ', '03', 'Infinity', 'NaN'])
      expect(requestedLevel(`?level=${bad}`, 8), bad).toBeNull();
  });

  it('never asks for more levels than the game has', () => {
    expect(requestedLevel(`?level=${LEVELS.length}`, LEVELS.length)).toBe(LEVELS.length);
    expect(requestedLevel(`?level=${LEVELS.length + 1}`, LEVELS.length)).toBeNull();
  });
});
