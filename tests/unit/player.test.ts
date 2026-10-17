import { describe, expect, it } from 'vitest';
import { bankFrame, screenBounds, stepPlayer, type MoveParams } from '../../src/logic/player';

const params: MoveParams = {
  speed: 100,
  bankRate: 4,
  bounds: { minX: 10, maxX: 246, minY: 10, maxY: 310 },
};
const at = (x: number, y: number, bank = 0) => ({ x, y, bank });

describe('stepPlayer', () => {
  it('stays still with no input', () => {
    expect(stepPlayer(at(100, 100), { x: 0, y: 0 }, 0.5, params)).toEqual(at(100, 100));
  });

  it('moves at speed × time on one axis', () => {
    const s = stepPlayer(at(100, 100), { x: 1, y: 0 }, 0.5, params);
    expect(s.x).toBeCloseTo(150);
    expect(s.y).toBe(100);
    const up = stepPlayer(at(100, 200), { x: 0, y: -1 }, 1, params);
    expect(up.y).toBeCloseTo(100);
  });

  it('moves diagonally at the same speed, not faster', () => {
    const s = stepPlayer(at(100, 100), { x: 1, y: 1 }, 1, params);
    expect(Math.hypot(s.x - 100, s.y - 100)).toBeCloseTo(100);
  });

  it('cannot leave the bounds', () => {
    expect(stepPlayer(at(12, 12), { x: -1, y: -1 }, 1, params)).toMatchObject({ x: 10, y: 10 });
    expect(stepPlayer(at(240, 300), { x: 1, y: 1 }, 1, params)).toMatchObject({ x: 246, y: 310 });
  });

  it('tilts toward the steering direction at bankRate per second', () => {
    expect(stepPlayer(at(100, 100, 0), { x: 1, y: 0 }, 0.1, params).bank).toBeCloseTo(0.4);
    expect(stepPlayer(at(100, 100, 0), { x: -1, y: 0 }, 1, params).bank).toBe(-1);
  });

  it('levels out again when steering stops, without overshooting', () => {
    expect(stepPlayer(at(100, 100, 1), { x: 0, y: 0 }, 0.1, params).bank).toBeCloseTo(0.6);
    expect(stepPlayer(at(100, 100, 0.1), { x: 0, y: 0 }, 1, params).bank).toBe(0);
    expect(stepPlayer(at(100, 100, -0.1), { x: 0, y: 0 }, 1, params).bank).toBe(0);
  });

  it('does not change the input state', () => {
    const before = at(100, 100);
    stepPlayer(before, { x: 1, y: 1 }, 1, params);
    expect(before).toEqual(at(100, 100));
  });
});

describe('screenBounds', () => {
  it('keeps the whole sprite plus margin on screen', () => {
    expect(screenBounds(256, 320, 48, 48, 2)).toEqual({ minX: 26, maxX: 230, minY: 26, maxY: 294 });
  });
});

describe('bankFrame', () => {
  const layout = [12, 11, 10, 13, 14] as const;

  it("maps tilt to the ship's five banking frames", () => {
    expect(bankFrame(-1, layout)).toBe(12);
    expect(bankFrame(-0.5, layout)).toBe(11);
    expect(bankFrame(0, layout)).toBe(10);
    expect(bankFrame(0.5, layout)).toBe(13);
    expect(bankFrame(1, layout)).toBe(14);
  });

  it('shows the level frame for a small tilt', () => {
    expect(bankFrame(0.2, layout)).toBe(10);
    expect(bankFrame(-0.2, layout)).toBe(10);
  });

  it('clamps out-of-range tilt', () => {
    expect(bankFrame(-3, layout)).toBe(12);
    expect(bankFrame(3, layout)).toBe(14);
  });
});
