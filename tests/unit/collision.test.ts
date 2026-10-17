import { describe, expect, it } from 'vitest';
import { firstHit, offScreen, overlaps } from '../../src/logic/collision';

const box = (x: number, y: number, w = 10, h = 10) => ({ x, y, w, h });

describe('overlaps', () => {
  it('detects overlapping boxes', () => {
    expect(overlaps(box(0, 0), box(5, 5))).toBe(true);
    expect(overlaps(box(0, 0), box(0, 0))).toBe(true);
  });

  it('ignores boxes that are apart on either axis', () => {
    expect(overlaps(box(0, 0), box(20, 0))).toBe(false);
    expect(overlaps(box(0, 0), box(0, 20))).toBe(false);
    expect(overlaps(box(0, 0), box(5, 20))).toBe(false);
  });

  it('does not count boxes that only touch edges', () => {
    expect(overlaps(box(0, 0), box(10, 0))).toBe(false);
  });

  it('handles boxes of different sizes', () => {
    expect(overlaps(box(0, 0, 100, 4), box(45, 0, 2, 2))).toBe(true);
    expect(overlaps(box(0, 0, 100, 4), box(0, 5, 2, 2))).toBe(false);
  });

  it('is symmetric', () => {
    const a = box(0, 0, 8, 30);
    const b = box(6, 12, 20, 6);
    expect(overlaps(a, b)).toBe(overlaps(b, a));
  });
});

describe('offScreen', () => {
  it('is false while any part of the box is on screen', () => {
    expect(offScreen(box(128, 160), 256, 320)).toBe(false);
    expect(offScreen(box(128, -4), 256, 320)).toBe(false);
  });

  it('is true once the box has fully left any edge', () => {
    expect(offScreen(box(128, -6), 256, 320)).toBe(true);
    expect(offScreen(box(128, 326), 256, 320)).toBe(true);
    expect(offScreen(box(-6, 160), 256, 320)).toBe(true);
    expect(offScreen(box(262, 160), 256, 320)).toBe(true);
  });
});

describe('firstHit', () => {
  it('returns the index of the first overlapping box', () => {
    const shots = [box(100, 100), box(0, 0), box(3, 3)];
    expect(firstHit(box(0, 0, 20, 20), shots)).toBe(1);
  });

  it('returns -1 when nothing overlaps', () => {
    expect(firstHit(box(0, 0), [box(50, 50), box(-50, 0)])).toBe(-1);
    expect(firstHit(box(0, 0), [])).toBe(-1);
  });
});
