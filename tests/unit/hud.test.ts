import { describe, expect, it } from 'vitest';
import { formatScore, healthPips } from '../../src/logic/hud';

describe('formatScore', () => {
  it('pads to six digits', () => {
    expect(formatScore(0)).toBe('000000');
    expect(formatScore(1250)).toBe('001250');
  });
  it('caps at 999999', () => {
    expect(formatScore(1_234_567)).toBe('999999');
  });
  it('drops fractions and rejects bad scores', () => {
    expect(formatScore(99.9)).toBe('000099');
    expect(() => formatScore(-1)).toThrow(RangeError);
    expect(() => formatScore(Number.NaN)).toThrow(RangeError);
  });
});

describe('healthPips', () => {
  it('shows one pip per hit left this life', () => {
    expect(healthPips(0, 5)).toEqual([true, true, true, true, true]);
    expect(healthPips(2, 5)).toEqual([true, true, true, false, false]);
    expect(healthPips(5, 5)).toEqual([false, false, false, false, false]);
  });
  it('shows every pip out once there are no lives left', () => {
    expect(healthPips(0, 5, 0)).toEqual([false, false, false, false, false]);
    expect(healthPips(0, 5, 1)).toEqual([true, true, true, true, true]);
  });

  it('never shows more or fewer pips than the life has', () => {
    expect(healthPips(-1, 5)).toHaveLength(5);
    expect(healthPips(-1, 5).every(Boolean)).toBe(true);
    expect(healthPips(9, 5).some(Boolean)).toBe(false);
    expect(() => healthPips(0, 0)).toThrow(RangeError);
  });
});
