import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/assets/manifest';
import { BOSSES, DIFFICULTY, ENEMY_TYPES, GAME_HEIGHT, GAME_WIDTH } from '../../src/config/tuning';
import { levelDifficulty } from '../../src/levels/difficulty';
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
import { LEVEL_4 } from '../../src/levels/level4';
import { LEVEL_5 } from '../../src/levels/level5';
import { LEVEL_6 } from '../../src/levels/level6';
import { LEVEL_7 } from '../../src/levels/level7';
import { bossTotalHp } from '../../src/logic/boss';
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
        if (layer.tint !== undefined) {
          expect(Number.isInteger(layer.tint), layer.texture).toBe(true);
          expect(layer.tint).toBeGreaterThanOrEqual(0);
          expect(layer.tint).toBeLessThanOrEqual(0xffffff);
        }
      }
      // The furthest-back layer is opaque, so nothing shows through it.
      expect(level.background[0]?.alpha).toBe(1);
    });

    it('scrolls every layer, except that the back layer may stay still if it fills the screen', () => {
      level.background.forEach((layer, i) => {
        if (i > 0) expect(layer.scrollSpeed, layer.texture).toBeGreaterThan(0);
        expect(layer.scrollSpeed, layer.texture).toBeGreaterThanOrEqual(0);
        if (layer.scrollSpeed === 0) {
          // A still layer must cover the whole screen height on its own (no repeat).
          const asset = ASSETS.find((a) => a.key === layer.texture);
          const height = asset?.kind === 'image' ? asset.height : (asset?.frameHeight ?? 0);
          expect(height * (layer.scale ?? 1), layer.texture).toBeGreaterThanOrEqual(GAME_HEIGHT);
        }
      });
    });

    it('covers the full screen width with every layer (no seam)', () => {
      for (const layer of level.background) {
        const asset = ASSETS.find((a) => a.key === layer.texture);
        const width = asset?.kind === 'image' ? asset.width : (asset?.frameWidth ?? 0);
        expect(width * (layer.scale ?? 1), layer.texture).toBeGreaterThanOrEqual(GAME_WIDTH);
      }
    });

    it('draws its props from images, on screen sideways, drifting slower than the nearest layer', () => {
      const nearest = Math.max(...level.background.map((l) => l.scrollSpeed));
      for (const prop of level.props ?? []) {
        expect(ASSETS.find((a) => a.key === prop.texture)?.kind, prop.texture).toBe('image');
        expect(prop.x).toBeGreaterThanOrEqual(0);
        expect(prop.x).toBeLessThanOrEqual(1);
        expect(prop.scrollSpeed).toBeGreaterThan(0);
        expect(prop.scrollSpeed).toBeLessThan(nearest);
        expect(prop.gap).toBeGreaterThanOrEqual(0);
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

    it('has difficulty numbers within the PROJECT.md 4a limits (M5.5)', () => {
      expect(level.number).toBeLessThanOrEqual(DIFFICULTY.lastLevel);
      const d = levelDifficulty(level.number);
      const first = levelDifficulty(1);
      expect(first.fire.interval / d.fire.interval).toBeLessThanOrEqual(DIFFICULTY.fireRateAtLast);
      expect(d.shotSpeed / first.shotSpeed).toBeLessThanOrEqual(DIFFICULTY.shotSpeedAtLast);
      expect(d.fire.jitter).toBeLessThan(d.fire.interval);
      expect(d.drops.chance).toBeLessThanOrEqual(1);
    });

    it('has a boss that exists and gets tougher level by level', () => {
      const boss = BOSSES[level.boss];
      expect(boss).toBeDefined();
      const before = LEVELS[level.number - 2];
      // A twin's two ships count together.
      if (before) expect(bossTotalHp(boss)).toBeGreaterThan(bossTotalHp(BOSSES[before.boss]));
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

describe('level 4 (M5.4)', () => {
  it('matches the approved plan: Red Giant, alien flyers and enemy type 3, upgraded spaceship unit', () => {
    expect(LEVEL_4).toMatchObject({ number: 4, name: 'Red Giant', boss: 'spaceship-unit-mk2' });
    expect(LEVEL_4.roster).toEqual(['diver', 'flyer']);
    expect(LEVEL_4.background.map((l) => l.texture)).toContain('bg-red-back');
    expect(LEVEL_4.props?.map((p) => p.texture)).toEqual([
      'bg-red-big-planet',
      'bg-red-ring-planet',
    ]);
    expect(LEVELS[3]).toBe(LEVEL_4);
  });

  it("has a boss with upgraded attacks: level 1's ship, tougher, with an extra phase and wider fans", () => {
    const one = BOSSES['spaceship-unit'];
    const four = BOSSES['spaceship-unit-mk2'];
    expect(four.sprite).toBe(one.sprite);
    expect(four.hp).toBeGreaterThan(one.hp);
    expect(four.phases.length).toBeGreaterThan(one.phases.length);
    const widest = (b: typeof one): number =>
      Math.max(...b.phases.flatMap((p) => p.attacks.map((a) => (a.kind === 'fan' ? a.shots : 1))));
    expect(widest(four)).toBeGreaterThan(widest(one));
  });
});

describe('level 5 (M6.2)', () => {
  it('matches the approved plan: Station Run, enemy types 1-3, the Zone 202 tunnel, vehicle-3 boss', () => {
    expect(LEVEL_5).toMatchObject({ number: 5, name: 'Station Run', boss: 'vehicle-3' });
    expect(LEVEL_5.roster).toEqual(['grunt', 'weaver', 'diver']);
    expect(LEVEL_5.background.map((l) => l.texture)).toEqual(['bg-station-tunnel']);
    expect(LEVELS[4]).toBe(LEVEL_5);
  });

  it('uses every enemy in its roster, and no asteroids inside the station', () => {
    expect(new Set(LEVEL_5.waves.map((s) => s.kind))).toEqual(new Set(LEVEL_5.roster));
  });

  it('has a boss too long for the screen, showing (and hittable on) its front half only', () => {
    const boss = BOSSES['vehicle-3'];
    const art = ASSETS.find((a) => a.key === boss.sprite);
    const tall = art?.kind === 'sheet' ? art.frameWidth : 0;
    expect(tall).toBeGreaterThan(GAME_HEIGHT);
    const bottom = boss.entry.hoverY + tall / 2;
    expect(bottom).toBeGreaterThan(tall / 3);
    expect(bottom).toBeLessThan(tall * 0.6);
    // The hitbox ends at the nose, on screen.
    expect(boss.entry.hoverY + boss.hitbox.offsetY + boss.hitbox.h / 2).toBeLessThanOrEqual(bottom);
  });
});

describe('level 6 (M6.3)', () => {
  it('matches the approved plan: Demon Rift, flying eyes and fire skulls, darker red layers, fire-skull boss', () => {
    expect(LEVEL_6).toMatchObject({ number: 6, name: 'Demon Rift', boss: 'fire-skull' });
    expect(LEVEL_6.roster).toEqual(['eye', 'skull']);
    expect(LEVEL_6.background.map((l) => l.texture)).toContain('bg-red-back');
    expect(LEVELS[5]).toBe(LEVEL_6);
  });

  it('darkens the red layers it shares with level 4', () => {
    const brightness = (tint = 0xffffff): number =>
      ((tint >> 16) & 0xff) + ((tint >> 8) & 0xff) + (tint & 0xff);
    for (const layer of LEVEL_6.background) {
      const four = LEVEL_4.background.find((l) => l.texture === layer.texture);
      if (four && layer.texture !== 'bg-red-stars')
        expect(brightness(layer.tint), layer.texture).toBeLessThan(brightness(four.tint));
    }
  });

  it('uses every enemy in its roster', () => {
    expect(new Set(LEVEL_6.waves.map((s) => s.kind))).toEqual(
      new Set([...LEVEL_6.roster, 'asteroid']),
    );
  });

  it("has the flaming fire skull as its boss, while its enemies are the skull's smaller, flameless form", () => {
    expect(BOSSES['fire-skull'].sprite).toBe('boss-fire-skull');
    expect(ENEMY_TYPES.skull.sprite).toBe('enemy-fire-skull');
    expect(BOSSES['fire-skull'].phases.length).toBeGreaterThan(BOSSES['vehicle-3'].phases.length);
  });
});

describe('level 7 (M6.4)', () => {
  it('matches the approved plan: Deep Dark, a mix of all enemies, stars only, twin vehicle-1 boss', () => {
    expect(LEVEL_7).toMatchObject({ number: 7, name: 'Deep Dark', boss: 'twin-vehicle-1' });
    expect(new Set(LEVEL_7.roster)).toEqual(new Set(Object.keys(ENEMY_TYPES)));
    expect(new Set(LEVEL_7.background.map((l) => l.texture))).toEqual(new Set(['bg-blue-stars']));
    expect(LEVELS[6]).toBe(LEVEL_7);
  });

  it('uses every enemy in its roster', () => {
    expect(new Set(LEVEL_7.waves.map((s) => s.kind))).toEqual(
      new Set([...LEVEL_7.roster, 'asteroid']),
    );
  });

  it("has two of level 2's boss, each tougher than level 2's alone", () => {
    const twin = BOSSES['twin-vehicle-1'];
    expect(twin.twin).toBeDefined();
    expect(twin.sprite).toBe(BOSSES['vehicle-1'].sprite);
    expect(twin.hp).toBeGreaterThan(BOSSES['vehicle-1'].hp);
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
