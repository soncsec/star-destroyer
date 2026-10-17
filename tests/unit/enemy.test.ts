import { createRng } from '../../src/logic/rng';
import { describe, expect, it } from 'vitest';
import { applyDamage, pickWeighted } from '../../src/logic/enemy';

describe('applyDamage', () => {
  it('reduces health and reports destruction at zero', () => {
    expect(applyDamage(3, 1)).toEqual({ hp: 2, destroyed: false });
    expect(applyDamage(1, 1)).toEqual({ hp: 0, destroyed: true });
  });

  it('never goes below zero', () => {
    expect(applyDamage(2, 5)).toEqual({ hp: 0, destroyed: true });
  });

  it('treats zero damage as no change', () => {
    expect(applyDamage(3, 0)).toEqual({ hp: 3, destroyed: false });
  });

  it('rejects negative damage', () => {
    expect(() => applyDamage(3, -1)).toThrow(RangeError);
  });
});

describe('pickWeighted', () => {
  const w = { grunt: 6, weaver: 3, diver: 1 };

  it('maps the roll onto the weights in order', () => {
    expect(pickWeighted(w, 0)).toBe('grunt');
    expect(pickWeighted(w, 0.599)).toBe('grunt');
    expect(pickWeighted(w, 0.6)).toBe('weaver');
    expect(pickWeighted(w, 0.899)).toBe('weaver');
    expect(pickWeighted(w, 0.9)).toBe('diver');
    expect(pickWeighted(w, 0.999999)).toBe('diver');
  });

  it('matches the weights over many seeded rolls', () => {
    const rng = createRng(5);
    const counts = { grunt: 0, weaver: 0, diver: 0 };
    for (let i = 0; i < 10_000; i++) counts[pickWeighted(w, rng.next())]++;
    expect(counts.grunt / 10_000).toBeCloseTo(0.6, 1);
    expect(counts.weaver / 10_000).toBeCloseTo(0.3, 1);
    expect(counts.diver / 10_000).toBeCloseTo(0.1, 1);
  });

  it('never picks a zero weight', () => {
    for (const roll of [0, 0.25, 0.5, 0.999]) {
      expect(pickWeighted({ grunt: 1, weaver: 0, diver: 1 }, roll)).not.toBe('weaver');
    }
  });

  it('rejects bad rolls and weights', () => {
    expect(() => pickWeighted(w, 1)).toThrow(RangeError);
    expect(() => pickWeighted(w, -0.1)).toThrow(RangeError);
    expect(() => pickWeighted({ a: 0, b: 0 }, 0.5)).toThrow(RangeError);
    expect(() => pickWeighted({ a: -1, b: 2 }, 0.5)).toThrow(RangeError);
  });
});
