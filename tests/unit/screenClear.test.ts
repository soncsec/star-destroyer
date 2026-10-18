import { describe, expect, it } from 'vitest';
import { screenClear } from '../../src/logic/screenClear';

const W = 256;
const H = 320;
const at = (x: number, y: number, points = 100) => ({ box: { x, y, w: 20, h: 20 }, points });

describe('screen clear', () => {
  it('destroys every enemy on screen and scores each one', () => {
    const r = screenClear([at(40, 40, 100), at(128, 160, 150), at(200, 300, 200)], W, H);
    expect(r.destroyed).toEqual([0, 1, 2]);
    expect(r.points).toBe(450);
  });

  it('spares enemies still completely off screen', () => {
    const r = screenClear([at(128, -11), at(128, 100), at(-11, 100), at(267, 100)], W, H);
    expect(r.destroyed).toEqual([1]);
    expect(r.points).toBe(100);
  });

  it('counts an enemy that is only partly on screen', () => {
    const r = screenClear([at(128, -9), at(128, H + 9)], W, H);
    expect(r.destroyed).toEqual([0, 1]);
  });

  it('does nothing on an empty screen', () => {
    expect(screenClear([], W, H)).toEqual({ destroyed: [], points: 0 });
  });
});
