import { describe, expect, it } from 'vitest';
import { driftY } from '../../src/logic/backdrop';

describe('background props', () => {
  it('drift down', () => {
    expect(driftY(100, 5, 40, 320, 0)).toBe(105);
  });

  it('come back in above the top after leaving the bottom, after the gap', () => {
    // Bottom edge passes 320 + 20 = 340; it reappears from -20 - 100 = -120.
    expect(driftY(338, 4, 40, 320, 100)).toBeCloseTo(342 - 460);
    expect(driftY(340, 0, 40, 320, 100)).toBe(340);
  });

  it('copes with a large step (wraps more than once)', () => {
    expect(driftY(0, 2 * 460, 40, 320, 100)).toBeCloseTo(0);
  });

  it('rejects a bad height or gap', () => {
    expect(() => driftY(0, 1, 0, 320, 0)).toThrow(RangeError);
    expect(() => driftY(0, 1, 10, 320, -1)).toThrow(RangeError);
  });
});
