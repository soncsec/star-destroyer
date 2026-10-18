import { describe, expect, it } from 'vitest';
import {
  bubbleVisible,
  collectShield,
  shieldSeconds,
  shieldUp,
  tickShield,
} from '../../src/logic/shield';

const rules = { duration: 30, warnAt: 3 };

describe('shield', () => {
  it('a pickup gives 30 seconds of protection', () => {
    const s = collectShield(0, rules);
    expect(s).toBe(30);
    expect(shieldUp(s)).toBe(true);
  });

  it('another pickup resets the timer to 30 s; it does not add up', () => {
    expect(collectShield(12, rules)).toBe(30);
    expect(collectShield(29, rules)).toBe(30);
  });

  it('counts down and runs out', () => {
    expect(tickShield(30, 10)).toBe(20);
    expect(tickShield(1, 5)).toBe(0);
    expect(shieldUp(tickShield(1, 5))).toBe(false);
  });

  it('rejects negative time', () => {
    expect(() => tickShield(5, -1)).toThrow(RangeError);
  });

  it('shows whole seconds counting down 30 … 1', () => {
    expect(shieldSeconds(30)).toBe(30);
    expect(shieldSeconds(29.2)).toBe(30);
    expect(shieldSeconds(0.1)).toBe(1);
    expect(shieldSeconds(0)).toBe(0);
  });

  it('the bubble is steady, then blinks in the last 3 seconds, then is gone', () => {
    expect(bubbleVisible(20, rules, 6)).toBe(true);
    expect(bubbleVisible(0, rules, 6)).toBe(false);
    const late = [2.95, 2.9, 2.85, 2.8].map((t) => bubbleVisible(t, rules, 6));
    expect(new Set(late).size).toBe(2); // both visible and hidden frames
  });
});
