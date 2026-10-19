import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/assets/manifest';
import {
  ENEMY_FIRE,
  FINAL_BOSS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER,
  PLAYER_HEALTH,
} from '../../src/config/tuning';
import { fanGap } from '../../src/logic/boss';
import {
  FINAL_PARTS,
  beamBox,
  canHurt,
  damageFinalBoss,
  finalBoxes,
  finalStage,
  finalTotalHp,
  finalTouching,
  partCenter,
  startFinalBoss,
  stepFinalBoss,
  type FinalBossRules,
  type FinalBossState,
  type FinalPart,
} from '../../src/logic/finalBoss';

const CX = 128;
const ship = { x: CX, y: 280 };
const part = (x: number, y: number, hp = 10) => ({
  hp,
  points: 100,
  offset: { x, y },
  hitbox: { w: 10, h: 10 },
  muzzleY: y + 10,
});
const rules: FinalBossRules = {
  entry: { startY: -40, hoverY: 60, speed: 100 },
  swayAmplitude: 20,
  shotSpeed: 100,
  maxAimAngleDeg: 30,
  parts: {
    cannonLeft: part(-40, 20),
    cannonRight: part(40, 20),
    helmet: part(0, 0),
    core: part(0, 2, 20),
  },
  hull: { w: 100, h: 60, offsetY: 0 },
  stages: {
    cannons: { attacks: [{ kind: 'aimed' }], cooldown: 1, swayHz: 0.25 },
    helmet: { attacks: [{ kind: 'fan', shots: 3, spreadDeg: 40 }], cooldown: 0.5, swayHz: 0.5 },
    core: { attacks: [{ kind: 'aimed' }], cooldown: 0.5, swayHz: 0.5 },
  },
  beam: { every: 2, warn: 1, fire: 1, width: 10 },
};

/** Steps until it has finished entering. */
function arrived(r: FinalBossRules = rules): FinalBossState {
  let s = startFinalBoss(r, CX);
  for (let i = 0; i < 100 && s.mode === 'entering'; i++)
    s = stepFinalBoss(s, r, 0.1, ship, CX).state;
  return s;
}

/** Destroys `parts`, in order. */
function without(s: FinalBossState, ...parts: FinalPart[]): FinalBossState {
  for (const p of parts) s = damageFinalBoss(s, rules, p, 999).state;
  return s;
}

/** Steps `n` times by `dt`, returning the last state and every volley's origin. */
function run(s: FinalBossState, n: number, dt = 0.1): { s: FinalBossState; from: number[] } {
  const from: number[] = [];
  for (let i = 0; i < n; i++) {
    const step = stepFinalBoss(s, rules, dt, ship, CX);
    s = step.state;
    for (const v of step.volleys) from.push(v.from.x - s.x);
  }
  return { s, from };
}

describe('final boss (M6.5)', () => {
  it('flies in from above, untouchable, then fights in the cannons stage', () => {
    const s = startFinalBoss(rules, CX);
    expect(s).toMatchObject({ mode: 'entering', x: CX, y: -40 });
    expect(finalBoxes(s, rules)).toEqual([]);
    expect(canHurt(s, 'cannonLeft')).toBe(false);
    expect(stepFinalBoss(s, rules, 0.1, ship, CX).volleys).toEqual([]);
    const a = arrived();
    expect(a).toMatchObject({ mode: 'fighting', y: 60 });
    expect(finalStage(a)).toBe('cannons');
    expect(finalTotalHp(rules)).toBe(50);
  });

  it('can only be hurt part by part: cannons, then the helmet, then the core', () => {
    let s = arrived();
    expect(FINAL_PARTS.filter((p) => canHurt(s, p))).toEqual(['cannonLeft', 'cannonRight']);
    // Armour and the hull block shots.
    expect(damageFinalBoss(s, rules, 'helmet', 5).state).toBe(s);
    expect(damageFinalBoss(s, rules, 'hull', 5).state).toBe(s);
    s = without(s, 'cannonLeft');
    expect(finalStage(s)).toBe('cannons');
    expect(damageFinalBoss(s, rules, 'cannonLeft', 5).state).toBe(s); // already gone
    s = without(s, 'cannonRight');
    expect(finalStage(s)).toBe('helmet');
    expect(FINAL_PARTS.filter((p) => canHurt(s, p))).toEqual(['helmet']);
    s = without(s, 'helmet');
    expect(finalStage(s)).toBe('core');
    expect(FINAL_PARTS.filter((p) => canHurt(s, p))).toEqual(['core']);
  });

  it('reports what it destroyed, and is defeated with its core', () => {
    const s = arrived();
    const hurt = damageFinalBoss(s, rules, 'cannonLeft', 4);
    expect(hurt).toMatchObject({ destroyed: null, defeated: false });
    expect(hurt.state.hp.cannonLeft).toBe(6);
    expect(damageFinalBoss(hurt.state, rules, 'cannonLeft', 6)).toMatchObject({
      destroyed: 'cannonLeft',
      defeated: false,
    });
    const core = without(s, 'cannonLeft', 'cannonRight', 'helmet');
    const end = damageFinalBoss(core, rules, 'core', 999);
    expect(end).toMatchObject({ destroyed: 'core', defeated: true });
    expect(end.state.mode).toBe('defeated');
    expect(stepFinalBoss(end.state, rules, 0.1, ship, CX)).toEqual({
      state: end.state,
      volleys: [],
    });
    expect(finalBoxes(end.state, rules)).toEqual([]);
  });

  it('a new stage starts with a full cooldown and a fresh attack order', () => {
    let s = arrived();
    s = { ...s, cooldown: 0.1, next: 3 };
    s = without(s, 'cannonLeft', 'cannonRight');
    expect(s).toMatchObject({ cooldown: 0.5, next: 0 });
    expect(s.beam).toEqual({ mode: 'idle', t: 0 });
  });

  it('shots strike the front-most box: a part, else the hull; the helmet hides the core', () => {
    const s = arrived();
    const at = (p: FinalPart) => ({ ...partCenter(s, rules, p), w: 2, h: 2 });
    expect(finalTouching(s, rules, at('cannonRight'))).toBe('cannonRight');
    expect(finalTouching(s, rules, at('helmet'))).toBe('helmet');
    expect(finalTouching(s, rules, { x: s.x + 30, y: s.y - 20, w: 2, h: 2 })).toBe('hull');
    expect(finalTouching(s, rules, { x: 0, y: 300, w: 2, h: 2 })).toBeNull();
    const open = without(s, 'cannonLeft', 'cannonRight', 'helmet');
    expect(finalTouching(open, rules, at('core'))).toBe('core');
    expect(finalTouching(open, rules, at('cannonLeft'))).toBe('hull');
    expect(finalBoxes(s, rules).map((b) => b.target)).toEqual([
      'cannonLeft',
      'cannonRight',
      'helmet',
      'hull',
    ]);
  });

  it('its cannons take turns, and one fights on alone', () => {
    const both = run(arrived(), 60).from;
    expect(both.slice(0, 4)).toEqual([-40, 40, -40, 40]);
    expect(run(without(arrived(), 'cannonLeft'), 30).from.every((x) => x === 40)).toBe(true);
    expect(run(without(arrived(), 'cannonRight'), 30).from.every((x) => x === -40)).toBe(true);
  });

  it('the helmet fires its fans from the middle', () => {
    const { from } = run(without(arrived(), 'cannonLeft', 'cannonRight'), 20);
    expect(from.length).toBeGreaterThan(0);
    expect(from.every((x) => x === 0)).toBe(true);
  });

  it('sways side to side while it is not firing its beam', () => {
    let s = arrived();
    const xs: number[] = [];
    for (let i = 0; i < 40; i++) {
      s = stepFinalBoss(s, rules, 0.1, ship, CX).state;
      xs.push(s.x);
    }
    expect(Math.max(...xs)).toBeCloseTo(CX + 20, 0);
    expect(Math.min(...xs)).toBeCloseTo(CX - 20, 0);
  });

  it("the core's beam: rests, then always warns before it fires, holding still, with no other shots", () => {
    let s = without(arrived(), 'cannonLeft', 'cannonRight', 'helmet');
    const seen: string[] = [];
    let quietDuringBeam = true;
    let xWhileBeam: number | null = null;
    let stillDuringBeam = true;
    for (let i = 0; i < 100; i++) {
      const step = stepFinalBoss(s, rules, 0.05, ship, CX);
      s = step.state;
      if (seen[seen.length - 1] !== s.beam.mode) seen.push(s.beam.mode);
      if (s.beam.mode !== 'idle') {
        if (step.volleys.length > 0) quietDuringBeam = false;
        xWhileBeam ??= s.x;
        if (s.x !== xWhileBeam) stillDuringBeam = false;
        expect(beamBox(s, rules, 320) !== null).toBe(s.beam.mode === 'firing');
      } else {
        xWhileBeam = null;
      }
    }
    expect(seen.slice(0, 4)).toEqual(['idle', 'warning', 'firing', 'idle']);
    expect(quietDuringBeam).toBe(true);
    expect(stillDuringBeam).toBe(true);
  });

  it('the beam runs from the core straight down off the screen', () => {
    const s: FinalBossState = {
      ...without(arrived(), 'cannonLeft', 'cannonRight', 'helmet'),
      beam: { mode: 'firing', t: 0 },
    };
    const top = s.y + rules.parts.core.muzzleY;
    expect(beamBox(s, rules, 320)).toEqual({ x: s.x, y: (top + 320) / 2, w: 10, h: 320 - top });
    expect(beamBox({ ...s, beam: { mode: 'warning', t: 0 } }, rules, 320)).toBeNull();
    expect(beamBox({ ...s, mode: 'defeated' }, rules, 320)).toBeNull();
  });

  it('a stage without attacks only sways', () => {
    const calm = {
      ...rules,
      stages: { ...rules.stages, cannons: { ...rules.stages.cannons, attacks: [] } },
    };
    let s = startFinalBoss(calm, CX);
    let shots = 0;
    for (let i = 0; i < 40; i++) {
      const step = stepFinalBoss(s, calm, 0.1, ship, CX);
      s = step.state;
      shots += step.volleys.length;
    }
    expect(shots).toBe(0);
  });

  it('rejects bad rules and inputs', () => {
    expect(() =>
      startFinalBoss({ ...rules, parts: { ...rules.parts, helmet: part(0, 0, 0) } }, CX),
    ).toThrow(RangeError);
    expect(() => stepFinalBoss(arrived(), rules, -1, ship, CX)).toThrow(RangeError);
    expect(() => damageFinalBoss(arrived(), rules, 'cannonLeft', -1)).toThrow(RangeError);
  });
});

describe('the tuned final boss (M6.5)', () => {
  const b = FINAL_BOSS;
  const shooters: Record<keyof typeof b.stages, readonly FinalPart[]> = {
    cannons: ['cannonLeft', 'cannonRight'],
    helmet: ['helmet'],
    core: ['core'],
  };

  it('starts above the screen and hovers on it, and stays on screen while swaying', () => {
    const art = ASSETS.find((a) => a.key === b.body);
    const tall = art?.kind === 'sheet' ? art.frameHeight : Infinity;
    expect(b.entry.startY + tall / 2).toBeLessThanOrEqual(0);
    expect(b.entry.hoverY + b.hull.offsetY - b.hull.h / 2).toBeGreaterThanOrEqual(0);
    expect(GAME_WIDTH / 2 - b.swayAmplitude - b.hull.w / 2).toBeGreaterThanOrEqual(0);
  });

  it('its parts sit within its body, and it gets tougher stage by stage', () => {
    for (const p of FINAL_PARTS) {
      const { offset } = b.parts[p];
      expect(Math.abs(offset.x)).toBeLessThan(96);
      expect(Math.abs(offset.y)).toBeLessThan(72);
    }
    expect(b.parts.helmet.hp).toBeGreaterThan(b.parts.cannonLeft.hp);
    expect(b.parts.core.hp).toBeGreaterThan(b.parts.helmet.hp);
    expect(b.parts.core.points).toBeGreaterThan(b.parts.helmet.points);
  });

  it('every fan leaves a gap the ship fits through, from whichever part fires it', () => {
    const needed = PLAYER_HEALTH.hitbox.w + 4;
    for (const [stage, rules] of Object.entries(b.stages) as [
      keyof typeof b.stages,
      FinalBossRules['stages']['core'],
    ][]) {
      for (const p of shooters[stage]) {
        const distance = PLAYER.startY * GAME_HEIGHT - (b.entry.hoverY + b.parts[p].muzzleY);
        for (const a of rules.attacks) {
          if (a.kind === 'fan')
            expect(fanGap(a, distance, ENEMY_FIRE.hitbox.w)).toBeGreaterThanOrEqual(needed);
        }
      }
    }
  });

  it('the beam warns long enough to get out of its way, and reaches the ship', () => {
    // From dead center, the ship must clear half the beam plus half itself.
    const clear = b.beam.width / 2 + PLAYER_HEALTH.hitbox.w / 2;
    expect(b.beam.warn * PLAYER.speed).toBeGreaterThanOrEqual(3 * clear);
    expect(b.entry.hoverY + b.parts.core.muzzleY).toBeLessThan(PLAYER.startY * GAME_HEIGHT);
    expect(b.beam.every).toBeGreaterThan(b.beam.warn + b.beam.fire);
  });

  it('draws the beam art and the part images from the asset manifest', () => {
    const keys = [b.body, b.thrust, b.rays, ...Object.values(b.partSprites)];
    for (const k of keys)
      expect(
        ASSETS.find((a) => a.key === k),
        k,
      ).toBeDefined();
    const rays = ASSETS.find((a) => a.key === b.rays);
    const frames = rays?.kind === 'sheet' ? rays.frames : 0;
    for (const f of [...b.rayFrames.warn, ...b.rayFrames.fire]) expect(f).toBeLessThan(frames);
  });
});

describe('the final boss keeps its place when a new stage starts (owner bug report 2026-10-18)', () => {
  it('cannons to helmet, and helmet to core, move it no further than a frame of swaying', () => {
    const rules = FINAL_BOSS;
    const dt = 1 / 60;
    const cx = GAME_WIDTH / 2;
    const target = { x: cx, y: GAME_HEIGHT - 40 };
    const fastest = Math.max(...Object.values(rules.stages).map((st) => st.swayHz));
    const maxStep = rules.swayAmplitude * 2 * Math.PI * fastest * dt + 1e-9;
    for (const fightFor of [3.1, 7.3, 12.7]) {
      let s = startFinalBoss(rules, cx);
      while (s.mode !== 'fighting') s = stepFinalBoss(s, rules, dt, target, cx).state;
      for (let t = 0; t < fightFor; t += dt) s = stepFinalBoss(s, rules, dt, target, cx).state;
      const parts: FinalPart[][] = [['cannonLeft', 'cannonRight'], ['helmet']];
      for (const group of parts) {
        const before = s;
        for (const part of group) s = damageFinalBoss(s, rules, part, rules.parts[part].hp).state;
        expect(finalStage(s)).not.toBe(finalStage(before));
        const after = stepFinalBoss(s, rules, dt, target, cx).state;
        expect(Math.abs(after.x - before.x), `${fightFor}s`).toBeLessThanOrEqual(maxStep);
        s = after;
      }
    }
  });
});
