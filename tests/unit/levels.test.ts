import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/assets/manifest';
import { ENEMY_TYPES } from '../../src/config/tuning';
import { LEVELS } from '../../src/levels';
import { ASTEROID_LIMITS, WAVE_LIMITS, screenTime } from '../../src/levels/limits';
import { LEVEL_1 } from '../../src/levels/level1';
import { checkWaves, mostAtOnce } from '../../src/logic/waves';

describe.each(LEVELS.map((level) => ({ level, name: `level ${level.number} (${level.name})` })))(
  'level format: $name',
  ({ level }) => {
    it('is numbered by its place in the list', () => {
      expect(level.number).toBe(LEVELS.indexOf(level) + 1);
    });

    it('has a name players can read', () => {
      expect(level.name).toMatch(/^[A-Za-z][A-Za-z ]{2,19}$/);
    });

    it('draws its background from images in the asset manifest', () => {
      expect(level.background.length).toBeGreaterThan(0);
      for (const layer of level.background) {
        const asset = ASSETS.find((a) => a.key === layer.texture);
        expect(asset, layer.texture).toBeDefined();
        expect(layer.alpha).toBeGreaterThan(0);
        expect(layer.alpha).toBeLessThanOrEqual(1);
        expect(layer.scrollSpeed).toBeGreaterThan(0);
      }
      // The furthest-back layer is opaque, so nothing shows through it.
      expect(level.background[0]?.alpha).toBe(1);
    });

    it('scrolls nearer layers faster (depth)', () => {
      const speeds = level.background.map((l) => l.scrollSpeed);
      expect(speeds).toEqual([...speeds].sort((a, b) => a - b));
    });

    it('spawns only enemies from its roster, plus asteroids', () => {
      expect(level.roster.length).toBeGreaterThan(0);
      for (const k of level.roster) expect(ENEMY_TYPES[k]).toBeDefined();
      const allowed = new Set<string>([...level.roster, 'asteroid']);
      for (const s of level.waves) expect(allowed.has(s.kind), s.kind).toBe(true);
    });

    it('passes every wave check, and fits the asteroid pool', () => {
      expect(level.waves.length).toBeGreaterThan(0);
      expect(checkWaves(level.waves, WAVE_LIMITS)).toEqual([]);
      expect(checkWaves(level.waves, ASTEROID_LIMITS)).toEqual([]);
    });

    it('gives the player a breather before the boss', () => {
      expect(level.bossAfter).toBeGreaterThanOrEqual(2);
    });
  },
);

describe('level 1 waves', () => {
  it('match the approved plan: Teal Nebula, grunts and weavers, spaceship-unit boss', () => {
    expect(LEVEL_1).toMatchObject({ number: 1, name: 'Teal Nebula', boss: 'spaceship-unit' });
    expect(LEVEL_1.roster).toEqual(['grunt', 'weaver']);
    expect(LEVELS[0]).toBe(LEVEL_1);
  });

  it('pass every wave check (order, positions on screen, crowd within the enemy pool)', () => {
    expect(checkWaves(LEVEL_1.waves, WAVE_LIMITS)).toEqual([]);
  });

  it('use only grunts and weavers (the approved level-1 roster), plus asteroids', () => {
    expect(new Set(LEVEL_1.waves.map((s) => s.kind))).toEqual(
      new Set(['grunt', 'weaver', 'asteroid']),
    );
  });

  it('never have more large asteroids at once than their pool holds', () => {
    expect(checkWaves(LEVEL_1.waves, ASTEROID_LIMITS)).toEqual([]);
  });

  it('keep the screen busy but within the pool, even looping', () => {
    const length = (LEVEL_1.waves.at(-1)?.t ?? 0) + LEVEL_1.bossAfter;
    const twoLoops = [...LEVEL_1.waves, ...LEVEL_1.waves.map((s) => ({ ...s, t: s.t + length }))];
    const crowd = mostAtOnce(twoLoops, WAVE_LIMITS.screenTime);
    expect(crowd).toBeGreaterThanOrEqual(6);
    expect(crowd).toBeLessThanOrEqual(WAVE_LIMITS.maxAtOnce);
  });
});

describe('wave limits', () => {
  it('keep weavers further from the edges than grunts (they sway)', () => {
    expect(WAVE_LIMITS.xRange['weaver']?.min).toBeGreaterThan(
      WAVE_LIMITS.xRange['grunt']?.min ?? 1,
    );
  });
  it('estimate screen time from each movement pattern', () => {
    expect(screenTime(ENEMY_TYPES.grunt.move)).toBeCloseTo(368 / 45);
    expect(
      screenTime({ kind: 'dive', enterSpeed: 70, hoverY: 70, hoverTime: 0.9, diveSpeed: 170 }),
    ).toBeCloseTo(94 / 70 + 0.9 + 368 / 170);
  });
});
