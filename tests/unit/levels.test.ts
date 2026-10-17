import { describe, expect, it } from 'vitest';
import { ENEMY_TYPES } from '../../src/config/tuning';
import { WAVE_LIMITS, screenTime } from '../../src/levels/limits';
import { LEVEL_1 } from '../../src/levels/level1';
import { checkWaves, mostAtOnce } from '../../src/logic/waves';

describe('level 1 waves', () => {
  it('pass every wave check (order, positions on screen, crowd within the enemy pool)', () => {
    expect(checkWaves(LEVEL_1.waves, WAVE_LIMITS)).toEqual([]);
  });

  it('use only grunts and weavers (the approved level-1 roster)', () => {
    expect(new Set(LEVEL_1.waves.map((s) => s.kind))).toEqual(new Set(['grunt', 'weaver']));
  });

  it('keep the screen busy but within the pool, even looping', () => {
    const length = (LEVEL_1.waves.at(-1)?.t ?? 0) + LEVEL_1.loopGap;
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
