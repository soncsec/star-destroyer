import { describe, expect, it } from 'vitest';
import { dragTarget, stepPlayerToward } from '../../src/logic/touch';
import type { MoveParams } from '../../src/logic/player';

const bounds = { minX: 10, maxX: 246, minY: 10, maxY: 310 };
const p: MoveParams = { speed: 120, bankRate: 6, bounds };

describe('touch steering (owner request 2026-10-18)', () => {
  it('moves the target as far as the finger has moved, wherever the finger is', () => {
    const drag = { finger: { x: 200, y: 300 }, ship: { x: 128, y: 272 } };
    expect(dragTarget(drag, { x: 200, y: 300 }, bounds)).toEqual({ x: 128, y: 272 });
    expect(dragTarget(drag, { x: 170, y: 250 }, bounds)).toEqual({ x: 98, y: 222 });
  });

  it('keeps the target on screen', () => {
    const drag = { finger: { x: 100, y: 100 }, ship: { x: 128, y: 272 } };
    expect(dragTarget(drag, { x: -500, y: 900 }, bounds)).toEqual({ x: 10, y: 310 });
    expect(dragTarget(drag, { x: 900, y: -900 }, bounds)).toEqual({ x: 246, y: 10 });
  });

  it('flies toward the target no faster than its top speed', () => {
    const s = stepPlayerToward({ x: 100, y: 200, bank: 0 }, { x: 200, y: 200 }, 0.5, p);
    expect(s.x).toBeCloseTo(160, 6); // 120 px/s for 0.5 s
    const diag = stepPlayerToward({ x: 100, y: 200, bank: 0 }, { x: 200, y: 300 }, 0.5, p);
    expect(Math.hypot(diag.x - 100, diag.y - 200)).toBeCloseTo(60, 6);
  });

  it('stops exactly on a target it can reach', () => {
    const s = stepPlayerToward({ x: 100, y: 200, bank: 0 }, { x: 105, y: 198 }, 0.5, p);
    expect(s).toMatchObject({ x: 105, y: 198 });
    expect(stepPlayerToward({ x: 50, y: 50, bank: 0 }, { x: 50, y: 50 }, 0.1, p)).toEqual({
      x: 50,
      y: 50,
      bank: 0,
    });
  });

  it('banks the way it moves, and levels out when it stops', () => {
    let s = { x: 100, y: 200, bank: 0 };
    s = stepPlayerToward(s, { x: 200, y: 200 }, 0.1, p);
    expect(s.bank).toBeCloseTo(0.6, 6);
    s = stepPlayerToward(s, { x: 0, y: 200 }, 0.5, p);
    expect(s.bank).toBe(-1);
    s = stepPlayerToward(s, { x: s.x, y: 200 }, 1, p);
    expect(s.bank).toBe(0);
  });

  it('stays within bounds and rejects negative time', () => {
    const s = stepPlayerToward({ x: 12, y: 12, bank: 0 }, { x: -50, y: -50 }, 1, p);
    expect(s).toMatchObject({ x: 10, y: 10 });
    expect(() => stepPlayerToward({ x: 0, y: 0, bank: 0 }, { x: 1, y: 1 }, -1, p)).toThrow(
      RangeError,
    );
  });
});
