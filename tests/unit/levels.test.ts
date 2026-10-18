import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/assets/manifest';
import { ENEMY_TYPES, GAME_WIDTH } from '../../src/config/tuning';
import { LEVELS } from '../../src/levels';
import {
  ASTEROID_LIMITS,
  WAVE_LIMITS,
  frameHeight,
  screenTime,
  sheetFrameHeight,
} from '../../src/levels/limits';
import { LEVEL_1 } from '../../src/levels/level1';
import { LEVEL_2 } from '../../src/levels/level2';
import { LEVEL_3 } from '../../src/levels/level3';
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

    it('covers the full screen width with every layer (no seam)', () => {
      for (const layer of level.background) {
        const asset = ASSETS.find((a) => a.key === layer.texture);
        const width = asset?.kind === 'image' ? asset.width : (asset?.frameWidth ?? 0);
        expect(width * (layer.scale ?? 1), layer.texture).toBeGreaterThanOrEqual(GAME_WIDTH);
      }
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

describe('level 2 (M4.4, own art and boss M5.2)', () => {
  it('matches the approved plan: Asteroid Belt, grunts and divers, purple field, vehicle-1 boss', () => {
    expect(LEVEL_2).toMatchObject({ number: 2, name: 'Asteroid Belt', boss: 'vehicle-1' });
    expect(LEVEL_2.background[0]?.texture).toBe('bg-asteroid-field');
    expect(LEVEL_2.roster).toEqual(['grunt', 'diver']);
    expect(LEVELS[1]).toBe(LEVEL_2);
  });

  it('has more asteroids than level 1 (a heavy asteroid level)', () => {
    const rocks = (waves: typeof LEVEL_1.waves): number =>
      waves.filter((s) => s.kind === 'asteroid').length;
    expect(rocks(LEVEL_2.waves)).toBeGreaterThan(2 * rocks(LEVEL_1.waves));
  });
});

describe('level 3 (M5.3)', () => {
  it('matches the approved plan: Blue Expanse, enemy types 2 and 3 plus alien flyers, vehicle-2 boss', () => {
    expect(LEVEL_3).toMatchObject({ number: 3, name: 'Blue Expanse', boss: 'vehicle-2' });
    expect(LEVEL_3.roster).toEqual(['weaver', 'diver', 'flyer']);
    expect(LEVEL_3.background[0]?.texture).toBe('bg-blue-back');
    expect(LEVELS[2]).toBe(LEVEL_3);
  });

  it('uses every enemy in its roster', () => {
    expect(new Set(LEVEL_3.waves.map((s) => s.kind))).toEqual(
      new Set([...LEVEL_3.roster, 'asteroid']),
    );
  });
});

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
  it("use each enemy kind's real frame height (the flyer is taller)", () => {
    expect(frameHeight('grunt')).toBe(48);
    expect(frameHeight('flyer')).toBe(64);
    expect(() => sheetFrameHeight('no-such-sprite')).toThrow('no sprite sheet');
    expect(() => sheetFrameHeight('bg-blue-back')).toThrow('no sprite sheet'); // an image, not a sheet
  });

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
