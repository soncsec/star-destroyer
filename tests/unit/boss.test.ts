import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/assets/manifest';
import {
  BOSSES,
  ENEMY_FIRE,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER,
  PLAYER_HEALTH,
} from '../../src/config/tuning';
import {
  attackShots,
  bossHealth,
  bossLineup,
  bossTotalHp,
  damageBoss,
  fanGap,
  phaseFor,
  startBoss,
  stepBoss,
  stepBossGroup,
  type BossRules,
  type BossState,
} from '../../src/logic/boss';

const CX = 128;
const rules: BossRules = {
  hp: 100,
  points: 1000,
  entry: { startY: -50, hoverY: 60, speed: 50 },
  swayAmplitude: 40,
  muzzleOffsetY: 30,
  shotSpeed: 100,
  maxAimAngleDeg: 30,
  phases: [
    { fromHp: 1, attacks: [{ kind: 'aimed' }], cooldown: 1, swayHz: 0.25 },
    {
      fromHp: 0.5,
      attacks: [{ kind: 'fan', shots: 3, spreadDeg: 60 }, { kind: 'aimed' }],
      cooldown: 0.5,
      swayHz: 0.5,
    },
  ],
};
const ship = { x: CX, y: 280 };

/** Steps until the boss has finished entering. */
function arrived(): BossState {
  let s = startBoss(rules, CX);
  for (let i = 0; i < 100 && s.mode === 'entering'; i++)
    s = stepBoss(s, rules, 0.1, ship, CX).state;
  return s;
}

describe('boss', () => {
  it('appears above the screen at full health, entering', () => {
    expect(startBoss(rules, CX)).toMatchObject({
      mode: 'entering',
      x: CX,
      y: -50,
      hp: 100,
      phase: 0,
    });
  });

  it('flies down to its hover height without firing, then starts fighting', () => {
    let s = startBoss(rules, CX);
    let shots = 0;
    while (s.mode === 'entering') {
      const step = stepBoss(s, rules, 0.1, ship, CX);
      shots += step.shots.length;
      s = step.state;
    }
    expect(shots).toBe(0);
    expect(s.y).toBe(60);
    expect(s.mode).toBe('fighting');
  });

  it('cannot be hurt while entering', () => {
    const s = startBoss(rules, CX);
    expect(damageBoss(s, rules, 50)).toEqual({ state: s, defeated: false });
  });

  it('sways side to side around the center while fighting', () => {
    let s = arrived();
    const xs: number[] = [];
    for (let i = 0; i < 40; i++) {
      s = stepBoss(s, rules, 0.1, ship, CX).state;
      xs.push(s.x);
    }
    expect(Math.max(...xs)).toBeCloseTo(CX + 40, 0);
    expect(Math.min(...xs)).toBeCloseTo(CX - 40, 0);
  });

  it('attacks once per cooldown, taking the phase attacks in turn', () => {
    let s = damageBoss(arrived(), rules, 60).state; // phase 2: fan then aimed
    expect(s.phase).toBe(1);
    const volleys: number[] = [];
    // 0.125 s steps add up exactly (0.1 doesn't in floating point).
    for (let i = 0; i < 16; i++) {
      const step = stepBoss(s, rules, 0.125, ship, CX);
      s = step.state;
      if (step.shots.length) volleys.push(step.shots.length);
    }
    expect(volleys).toEqual([3, 1, 3, 1]); // every 0.5 s over 2 s
  });

  it('a phase without attacks just sways', () => {
    const calm = { ...rules, phases: [{ fromHp: 1, attacks: [], cooldown: 0.2, swayHz: 1 }] };
    let s = startBoss(calm, CX);
    let shots = 0;
    for (let i = 0; i < 60; i++) {
      const step = stepBoss(s, calm, 0.1, ship, CX);
      shots += step.shots.length;
      s = step.state;
    }
    expect(s.mode).toBe('fighting');
    expect(shots).toBe(0);
  });

  it('switches to harder phases as its health falls', () => {
    expect(phaseFor(100, rules)).toBe(0);
    expect(phaseFor(51, rules)).toBe(0);
    expect(phaseFor(50, rules)).toBe(1);
    expect(phaseFor(1, rules)).toBe(1);
  });

  it('is defeated at 0 health, and then does nothing more', () => {
    const hit = damageBoss(arrived(), rules, 150);
    expect(hit.defeated).toBe(true);
    expect(hit.state).toMatchObject({ mode: 'defeated', hp: 0 });
    expect(stepBoss(hit.state, rules, 1, ship, CX).shots).toEqual([]);
    expect(damageBoss(hit.state, rules, 5).defeated).toBe(false);
  });

  it('reports health as a fraction for the health bar', () => {
    expect(bossHealth(damageBoss(arrived(), rules, 25).state, rules)).toBe(0.75);
  });

  it('aims at the ship, but no more than the max angle from straight down', () => {
    const [v] = attackShots({ kind: 'aimed' }, rules, { x: 0, y: 0 }, { x: 1000, y: 10 });
    expect(Math.atan2(v?.x ?? 0, v?.y ?? 0) * (180 / Math.PI)).toBeCloseTo(30);
  });

  it('spreads a fan evenly around straight down, all at the shot speed', () => {
    const v = attackShots({ kind: 'fan', shots: 3, spreadDeg: 60 }, rules, { x: 0, y: 0 }, ship);
    const deg = v.map((s) => Math.round(Math.atan2(s.x, s.y) * (180 / Math.PI)));
    expect(deg).toEqual([-30, 0, 30]);
    for (const s of v) expect(Math.hypot(s.x, s.y)).toBeCloseTo(100);
    expect(
      attackShots({ kind: 'fan', shots: 1, spreadDeg: 60 }, rules, { x: 0, y: 0 }, ship),
    ).toEqual([{ x: 0, y: 100 }]);
  });

  it('measures the gap between fan shots', () => {
    const fan = { kind: 'fan', shots: 3, spreadDeg: 90 } as const;
    expect(fanGap(fan, 100, 6)).toBeCloseTo(100 - 6); // tan 45° = 1
    expect(fanGap({ kind: 'fan', shots: 1, spreadDeg: 0 }, 100, 6)).toBe(Infinity);
  });

  it('rejects bad rules and inputs', () => {
    expect(() => startBoss({ ...rules, hp: 0 }, CX)).toThrow(RangeError);
    expect(() =>
      startBoss({ ...rules, phases: [{ fromHp: 0.5, attacks: [], cooldown: 1, swayHz: 0 }] }, CX),
    ).toThrow(RangeError);
    expect(() => stepBoss(arrived(), rules, -1, ship, CX)).toThrow(RangeError);
    expect(() => damageBoss(arrived(), rules, -1)).toThrow(RangeError);
    expect(() => attackShots({ kind: 'fan', shots: 0, spreadDeg: 10 }, rules, ship, ship)).toThrow(
      RangeError,
    );
    expect(() => stepBoss({ ...arrived(), phase: 9 }, rules, 0.1, ship, CX)).toThrow(RangeError);
  });
});

describe('twin bosses (M6.4)', () => {
  const twin: BossRules = { ...rules, twin: { offsetX: 60 } };

  /** Starts every ship of `r` and steps them all until they're fighting. */
  function startGroup(r: BossRules): { parts: BossState[]; slots: ReturnType<typeof bossLineup> } {
    const slots = bossLineup(r, CX);
    let parts = slots.map((s) => startBoss(r, s.centerX, s.side, s.delay));
    for (let i = 0; i < 100 && parts.some((p) => p.mode === 'entering'); i++)
      parts = stepBossGroup(parts, r, 0.1, ship, slots).parts;
    return { parts, slots };
  }

  it('a normal boss is one ship at the center', () => {
    expect(bossLineup(rules, CX)).toEqual([{ centerX: CX, side: 1, delay: 0 }]);
    expect(bossTotalHp(rules)).toBe(100);
  });

  it('a twin is two ships either side of the center, mirrored, the second attacking half a cooldown later', () => {
    expect(bossLineup(twin, CX)).toEqual([
      { centerX: CX - 60, side: 1, delay: 0 },
      { centerX: CX + 60, side: -1, delay: 0.5 },
    ]);
    expect(bossTotalHp(twin)).toBe(200);
    expect(startBoss(twin, CX + 60, -1, 0.5)).toMatchObject({ side: -1, cooldown: 1.5 });
  });

  it('twins sway as mirror images', () => {
    const start = startGroup(twin);
    let { parts } = start;
    const { slots } = start;
    for (let i = 0; i < 30; i++) {
      parts = stepBossGroup(parts, twin, 0.1, ship, slots).parts;
      const [a, b] = parts as [BossState, BossState];
      expect(a.x - (CX - 60)).toBeCloseTo(-(b.x - (CX + 60)), 6);
    }
  });

  it('one ship steps exactly as a single boss does', () => {
    const start = startGroup(rules);
    const { slots } = start;
    let { parts } = start;
    let single = arrived();
    for (let i = 0; i < 50; i++) {
      const group = stepBossGroup(parts, rules, 0.1, ship, slots);
      const one = stepBoss(single, rules, 0.1, ship, CX);
      parts = group.parts;
      single = one.state;
      expect(parts[0]).toEqual(single);
      expect(group.volleys.flatMap((v) => v.shots)).toEqual(one.shots);
      for (const v of group.volleys) expect(v.from).toEqual({ x: single.x, y: single.y + 30 });
    }
  });

  it('after one twin attacks, the other waits at least half a cooldown, so volleys never land together', () => {
    const start = startGroup(twin);
    const { slots } = start;
    let { parts } = start;
    const fired: { t: number; ship: number }[] = [];
    const dt = 0.05;
    for (let i = 0; i < 400; i++) {
      const step = stepBossGroup(parts, twin, dt, ship, slots);
      for (const v of step.volleys) fired.push({ t: i * dt, ship: v.from.x < CX ? 0 : 1 });
      parts = step.parts;
      if (i === 200) parts = parts.map((p) => damageBoss(p, twin, 60).state); // into phase 2
    }
    expect(new Set(fired.map((f) => f.ship))).toEqual(new Set([0, 1]));
    for (let i = 1; i < fired.length; i++) {
      const a = fired[i - 1] as { t: number; ship: number };
      const b = fired[i] as { t: number; ship: number };
      // The faster phase's cooldown is 0.5 s, so at least 0.25 s apart.
      expect(b.t - a.t).toBeGreaterThanOrEqual(0.25 - dt - 1e-9);
    }
  });

  it('a twin fights on alone once the other is defeated', () => {
    const start = startGroup(twin);
    const { slots } = start;
    let { parts } = start;
    parts = [damageBoss(parts[0] as BossState, twin, 999).state, parts[1] as BossState];
    let shots = 0;
    for (let i = 0; i < 40; i++) {
      const step = stepBossGroup(parts, twin, 0.1, ship, slots);
      parts = step.parts;
      shots += step.volleys.length;
    }
    expect(parts[0]?.mode).toBe('defeated');
    expect(parts[1]?.mode).toBe('fighting');
    expect(shots).toBeGreaterThan(0);
  });

  it('rejects bad twins and inputs', () => {
    expect(() => bossLineup({ ...rules, twin: { offsetX: 0 } }, CX)).toThrow(RangeError);
    expect(() => bossLineup({ ...twin, phases: [] }, CX)).toThrow(RangeError);
    expect(() => startBoss(rules, CX, 1, -1)).toThrow(RangeError);
    const { parts } = startGroup(twin);
    expect(() => stepBossGroup(parts, twin, 0.1, ship, [])).toThrow(RangeError);
  });
});

describe.each(Object.entries(BOSSES).map(([kind, boss]) => ({ kind, boss })))(
  'boss $kind (tuned)',
  ({ boss }) => {
    it('starts above the screen and hovers on it', () => {
      const { h, offsetY } = boss.hitbox;
      expect(boss.entry.startY + offsetY + h / 2).toBeLessThanOrEqual(0);
      expect(boss.entry.hoverY + offsetY - h / 2).toBeGreaterThanOrEqual(0);
    });

    it('starts with its whole sprite above the screen', () => {
      const art = ASSETS.find((a) => a.key === boss.sprite);
      expect(art?.kind).toBe('sheet');
      // Turned a quarter turn, the frame's width is its height on screen.
      const turned = Math.abs(boss.angleDeg) % 180 === 90;
      const tall = art?.kind !== 'sheet' ? Infinity : turned ? art.frameWidth : art.frameHeight;
      expect(boss.entry.startY + tall / 2).toBeLessThanOrEqual(0);
    });

    it('fires from inside its hitbox, at its nose', () => {
      const { h, offsetY } = boss.hitbox;
      expect(boss.muzzleOffsetY).toBeGreaterThan(offsetY);
      expect(boss.muzzleOffsetY).toBeLessThanOrEqual(offsetY + h / 2 + 12);
    });

    it('stays on screen while swaying', () => {
      for (const slot of bossLineup(boss, GAME_WIDTH / 2)) {
        expect(slot.centerX - boss.swayAmplitude - boss.hitbox.w / 2).toBeGreaterThanOrEqual(0);
        expect(slot.centerX + boss.swayAmplitude + boss.hitbox.w / 2).toBeLessThanOrEqual(
          GAME_WIDTH,
        );
      }
    });

    it('twins never overlap, even swaying toward each other', () => {
      const [a, b] = bossLineup(boss, GAME_WIDTH / 2);
      if (!a || !b) return;
      const closest = b.centerX - a.centerX - 2 * boss.swayAmplitude;
      expect(closest).toBeGreaterThanOrEqual(boss.hitbox.w);
    });

    it('gets harder phase by phase: lower thresholds, shorter cooldowns, faster sway', () => {
      const p = boss.phases;
      expect(p[0]?.fromHp).toBe(1);
      for (let i = 1; i < p.length; i++) {
        expect(p[i]?.fromHp).toBeLessThan(p[i - 1]?.fromHp ?? 0);
        expect(p[i]?.cooldown).toBeLessThan(p[i - 1]?.cooldown ?? 0);
        expect(p[i]?.swayHz).toBeGreaterThan(p[i - 1]?.swayHz ?? Infinity);
      }
    });

    it('every fan leaves a gap the ship fits through, at its starting height', () => {
      const distance = PLAYER.startY * GAME_HEIGHT - (boss.entry.hoverY + boss.muzzleOffsetY);
      const needed = PLAYER_HEALTH.hitbox.w + 4;
      for (const phase of boss.phases) {
        for (const a of phase.attacks) {
          if (a.kind === 'fan')
            expect(fanGap(a, distance, ENEMY_FIRE.hitbox.w)).toBeGreaterThanOrEqual(needed);
        }
      }
    });
  },
);
