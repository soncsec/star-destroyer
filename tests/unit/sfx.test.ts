import { describe, expect, it } from 'vitest';
import { SFX, WEAPON_LEVELS } from '../../src/config/tuning';
import { checkRecipe, renderSound, type SoundRecipe } from '../../src/logic/sfx';

const RATE = 8000;
const tone = (over: Partial<SoundRecipe> = {}): SoundRecipe => ({
  wave: 'sine',
  seconds: 1,
  from: 440,
  to: 440,
  attack: 0.01,
  volume: 0.5,
  ...over,
});

/** Sign changes between `a` and `b` (fractions of the sound): about twice the pitch per second. */
function crossings(s: Float32Array, a = 0, b = 1): number {
  let n = 0;
  const end = Math.floor(b * (s.length - 1));
  for (let i = Math.floor(a * (s.length - 1)) + 1; i <= end; i++) {
    if ((s[i - 1] as number) < 0 !== (s[i] as number) < 0) n++;
  }
  return n;
}

describe('sounds made in code (M7.3)', () => {
  it('renders the right length, within its volume, silent at both ends', () => {
    const s = renderSound(tone(), RATE);
    expect(s.length).toBe(RATE);
    expect(Math.max(...s.map(Math.abs))).toBeLessThanOrEqual(0.5);
    expect(Math.max(...s.map(Math.abs))).toBeGreaterThan(0.4);
    expect(s[0]).toBe(0);
    expect(s[s.length - 1]).toBe(0);
  });

  it('plays at its pitch', () => {
    // 440 Hz for 1 s: about 880 sign changes.
    expect(crossings(renderSound(tone(), RATE))).toBeGreaterThan(860);
    expect(crossings(renderSound(tone(), RATE))).toBeLessThan(900);
  });

  it('sweeps its pitch from start to end', () => {
    const up = renderSound(tone({ from: 200, to: 800 }), RATE);
    expect(crossings(up, 0.6, 0.9)).toBeGreaterThan(crossings(up, 0.1, 0.4));
    const down = renderSound(tone({ from: 800, to: 200 }), RATE);
    expect(crossings(down, 0.6, 0.9)).toBeLessThan(crossings(down, 0.1, 0.4));
  });

  it('plays its notes in turn', () => {
    const s = renderSound(tone({ steps: [1, 2] }), RATE);
    const first = crossings(s, 0.05, 0.45);
    const second = crossings(s, 0.55, 0.95);
    expect(second / first).toBeCloseTo(2, 1);
  });

  it('draws every wave shape', () => {
    for (const wave of ['square', 'triangle', 'sawtooth', 'sine', 'noise'] as const) {
      const s = renderSound(tone({ wave }), RATE);
      expect(Math.max(...s.map(Math.abs)), wave).toBeGreaterThan(0.3);
    }
  });

  it('rises over its attack, then fades away', () => {
    const s = renderSound(tone({ wave: 'square', attack: 0.5 }), RATE);
    const at = (t: number): number => Math.abs(s[Math.floor(t * (s.length - 1))] as number);
    expect(at(0.1)).toBeLessThan(at(0.4));
    expect(at(0.6)).toBeGreaterThan(at(0.9));
    expect(renderSound(tone({ attack: 0 }), RATE)[0]).toBe(0);
  });

  it('noise is the same every time for the same seed', () => {
    const r = tone({ wave: 'noise', from: 2000, to: 2000 });
    expect(renderSound(r, RATE, 7)).toEqual(renderSound(r, RATE, 7));
    expect(renderSound(r, RATE, 7)).not.toEqual(renderSound(r, RATE, 8));
  });

  it('rejects bad recipes', () => {
    const bad: Partial<SoundRecipe>[] = [
      { seconds: 0 },
      { from: 0 },
      { to: -1 },
      { volume: 0 },
      { volume: 1.5 },
      { attack: -0.1 },
      { attack: 1 },
      { steps: [] },
      { steps: [1, 0] },
    ];
    for (const b of bad) expect(() => checkRecipe(tone(b)), JSON.stringify(b)).toThrow(RangeError);
    expect(() => renderSound(tone(), 0)).toThrow(RangeError);
  });

  it('every tuned sound can be heard: long enough, and loud enough after the master volume', () => {
    // Owner 2026-10-18: a 0.07 s shot at volume 0.15 made no audible sound.
    for (const [name, r] of Object.entries(SFX.sounds)) {
      expect(r.seconds, name).toBeGreaterThanOrEqual(0.1);
      const s = renderSound(r, RATE);
      const peak = Math.max(...s.map(Math.abs)) * SFX.volume;
      expect(peak, name).toBeGreaterThanOrEqual(0.1);
    }
  });

  it('each weapon level sounds deeper than the last; two or three rays add a whoosh (owner 2026-10-19)', () => {
    const pitch = (name: (typeof WEAPON_LEVELS)[number]['sound']): number =>
      crossings(renderSound(SFX.sounds[name], RATE)) / SFX.sounds[name].seconds;
    for (let i = 1; i < WEAPON_LEVELS.length; i++) {
      const [before, now] = [WEAPON_LEVELS[i - 1], WEAPON_LEVELS[i]];
      if (!before || !now) throw new Error('missing level');
      expect(SFX.sounds[now.sound].from, `level ${i + 1}`).toBeLessThan(
        SFX.sounds[before.sound].from,
      );
      expect(SFX.sounds[now.sound].to, `level ${i + 1}`).toBeLessThan(SFX.sounds[before.sound].to);
      expect(pitch(now.sound), `level ${i + 1}`).toBeLessThan(pitch(before.sound));
    }
    expect(WEAPON_LEVELS[0]?.sound).toBe('shot'); // the first weapon keeps its sound
    for (const level of WEAPON_LEVELS) {
      expect(level.whoosh !== undefined, `${level.shots.length} shots`).toBe(
        level.shots.length > 1,
      );
      if (level.whoosh) expect(SFX.sounds[level.whoosh].wave).toBe('noise');
    }
    const [two, three] = WEAPON_LEVELS.flatMap((l) => (l.whoosh ? [SFX.sounds[l.whoosh]] : []));
    expect(WEAPON_LEVELS.filter((l) => l.whoosh)).toHaveLength(2);
    expect(three?.seconds).toBeGreaterThan(two?.seconds ?? Infinity);
    expect(three?.volume).toBeGreaterThan(two?.volume ?? Infinity);
  });

  it('every tuned sound is a valid, short recipe', () => {
    for (const [name, r] of Object.entries(SFX.sounds)) {
      expect(() => checkRecipe(r), name).not.toThrow();
      expect(r.seconds, name).toBeLessThanOrEqual(2);
    }
    expect(SFX.volume).toBeGreaterThan(0);
    expect(SFX.volume).toBeLessThanOrEqual(1);
  });
});

describe('the health gem sound (M7.18)', () => {
  const chime = SFX.sounds.healthUp;

  it('is a soft rising chime of four notes, unlike the other pickups', () => {
    expect(chime.wave).toBe('sine');
    expect(chime.steps).toEqual([1, 1.26, 1.5, 2]);
    const s = renderSound(chime, RATE);
    const quarter = (n: number): number => crossings(s, n * 0.25 + 0.03, (n + 1) * 0.25 - 0.03);
    expect(quarter(3)).toBeGreaterThan(quarter(0) * 1.6);
    for (const other of ['weaponUp', 'shieldUp', 'screenClear'] as const) {
      expect(SFX.sounds[other]).not.toEqual(chime);
    }
  });
});
