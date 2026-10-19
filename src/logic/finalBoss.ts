/**
 * The final boss (M6.5): the top-down multi-part boss of level 8. Plain
 * TypeScript, no Phaser (ADR-006).
 *
 * It is fought in three stages, each with its own weak point:
 * 1. Cannons: the two cannons take turns firing. Only they can be hurt.
 * 2. Helmet: once both cannons are down, the helmet fires fans. Only it can
 *    be hurt.
 * 3. Core: with the helmet gone, the exposed core fires aimed shots and,
 *    every so often, a beam straight down. The beam always charges first
 *    (a visible warning), and the boss holds still while it charges and fires.
 * Shots that hit the hull, or a part that can't be hurt yet, are blocked.
 * The boss is defeated when its core is.
 */
import { attackShots, type BossAttack, type BossRules, type BossVolley } from './boss';
import { firstHit, type Box } from './collision';
import type { Vec } from './enemyFire';

export type FinalPart = 'cannonLeft' | 'cannonRight' | 'helmet' | 'core';
export const FINAL_PARTS: readonly FinalPart[] = ['cannonLeft', 'cannonRight', 'helmet', 'core'];

export type FinalStage = 'cannons' | 'helmet' | 'core';

/** What can be hit: one of the parts, or the hull (which blocks shots). */
export type FinalTarget = FinalPart | 'hull';

export interface FinalPartRules {
  hp: number;
  points: number;
  /** Center, relative to the boss's center. */
  offset: Vec;
  hitbox: { w: number; h: number };
  /** Its shots leave from this far below the boss's center. */
  muzzleY: number;
}

export interface FinalStageRules {
  /** Attacks used in turn, one per `cooldown` seconds. */
  attacks: readonly BossAttack[];
  cooldown: number;
  /** Side-to-side sways per second. */
  swayHz: number;
}

export interface FinalBossRules {
  entry: { startY: number; hoverY: number; speed: number };
  swayAmplitude: number;
  shotSpeed: number;
  maxAimAngleDeg: number;
  parts: Readonly<Record<FinalPart, FinalPartRules>>;
  /** The body around the parts: blocks shots, and hurts a ship that flies into it. */
  hull: { w: number; h: number; offsetY: number };
  stages: Readonly<Record<FinalStage, FinalStageRules>>;
  /** The core's beam: seconds between beams, of warning, and of firing; its width. */
  beam: { every: number; warn: number; fire: number; width: number };
}

export type BeamMode = 'idle' | 'warning' | 'firing';

export interface FinalBossState {
  mode: 'entering' | 'fighting' | 'defeated';
  x: number;
  y: number;
  hp: Record<FinalPart, number>;
  /** Seconds of swaying (it stops while the beam charges and fires). */
  t: number;
  /** How far through its swing, in whole swings, at the current stage's `swayHz`: a new stage changes the speed, never the position. */
  sway: number;
  cooldown: number;
  /** Which of the stage's attacks comes next. */
  next: number;
  /** Which cannon fires next (0 left, 1 right). */
  turn: number;
  beam: { mode: BeamMode; t: number };
}

/** The stage a boss in this state is in. */
export function finalStage(s: FinalBossState): FinalStage {
  if (s.hp.cannonLeft > 0 || s.hp.cannonRight > 0) return 'cannons';
  return s.hp.helmet > 0 ? 'helmet' : 'core';
}

/** Whether `part` can be hurt now: it is alive, and its stage has come. */
export function canHurt(s: FinalBossState, part: FinalPart): boolean {
  if (s.mode !== 'fighting' || s.hp[part] <= 0) return false;
  const stage = finalStage(s);
  if (part === 'cannonLeft' || part === 'cannonRight') return stage === 'cannons';
  return stage === part;
}

/** Health across every part. */
export const finalTotalHp = (rules: FinalBossRules): number =>
  FINAL_PARTS.reduce((sum, p) => sum + rules.parts[p].hp, 0);

/** The boss appearing above the screen, centered on `centerX`. */
export function startFinalBoss(rules: FinalBossRules, centerX: number): FinalBossState {
  for (const p of FINAL_PARTS) {
    if (rules.parts[p].hp <= 0) throw new RangeError(`${p} hp must be positive`);
  }
  return {
    mode: 'entering',
    x: centerX,
    y: rules.entry.startY,
    hp: Object.fromEntries(FINAL_PARTS.map((p) => [p, rules.parts[p].hp])) as Record<
      FinalPart,
      number
    >,
    t: 0,
    sway: 0,
    cooldown: rules.stages.cannons.cooldown,
    next: 0,
    turn: 0,
    beam: { mode: 'idle', t: 0 },
  };
}

/** Where a part is on screen. */
export function partCenter(s: FinalBossState, rules: FinalBossRules, part: FinalPart): Vec {
  const { offset } = rules.parts[part];
  return { x: s.x + offset.x, y: s.y + offset.y };
}

/** The live parts' boxes (and the hull), front-most first: what a shot would strike. */
export function finalBoxes(
  s: FinalBossState,
  rules: FinalBossRules,
): { target: FinalTarget; box: Box }[] {
  if (s.mode !== 'fighting') return [];
  const boxes: { target: FinalTarget; box: Box }[] = [];
  for (const part of FINAL_PARTS) {
    if (s.hp[part] <= 0) continue;
    // The helmet covers the core until it is destroyed.
    if (part === 'core' && s.hp.helmet > 0) continue;
    const c = partCenter(s, rules, part);
    boxes.push({ target: part, box: { ...c, ...rules.parts[part].hitbox } });
  }
  const { hull } = rules;
  boxes.push({ target: 'hull', box: { x: s.x, y: s.y + hull.offsetY, w: hull.w, h: hull.h } });
  return boxes;
}

/** What `box` strikes first, or null. */
export function finalTouching(
  s: FinalBossState,
  rules: FinalBossRules,
  box: Box,
): FinalTarget | null {
  const boxes = finalBoxes(s, rules);
  const i = firstHit(
    box,
    boxes.map((b) => b.box),
  );
  return boxes[i]?.target ?? null;
}

/** The beam's box while it fires (from the core down past the screen), otherwise null. */
export function beamBox(
  s: FinalBossState,
  rules: FinalBossRules,
  screenHeight: number,
): Box | null {
  if (s.mode !== 'fighting' || s.beam.mode !== 'firing') return null;
  const top = s.y + rules.parts.core.muzzleY;
  const h = screenHeight - top;
  return { x: s.x, y: top + h / 2, w: rules.beam.width, h };
}

/** Rules for `attackShots`, which only reads the shot speed and aim limit. */
function aimRules(rules: FinalBossRules): BossRules {
  return {
    hp: 1,
    points: 0,
    entry: rules.entry,
    swayAmplitude: 0,
    phases: [],
    muzzleOffsetY: 0,
    shotSpeed: rules.shotSpeed,
    maxAimAngleDeg: rules.maxAimAngleDeg,
  };
}

/** Which part fires the stage's next attack, and from where. */
function shooter(s: FinalBossState, rules: FinalBossRules, stage: FinalStage): Vec {
  const left = s.hp.cannonLeft > 0 && (s.hp.cannonRight <= 0 || s.turn % 2 === 0);
  const part: FinalPart = stage !== 'cannons' ? stage : left ? 'cannonLeft' : 'cannonRight';
  const { offset, muzzleY } = rules.parts[part];
  return { x: s.x + offset.x, y: s.y + muzzleY };
}

/**
 * Advances the boss by `dt` seconds. Returns its new state and any volleys it
 * fires this step.
 */
export function stepFinalBoss(
  s: FinalBossState,
  rules: FinalBossRules,
  dt: number,
  target: Vec,
  centerX: number,
): { state: FinalBossState; volleys: BossVolley[] } {
  if (dt < 0) throw new RangeError('dt must not be negative');
  if (s.mode === 'defeated') return { state: s, volleys: [] };
  if (s.mode === 'entering') {
    const y = Math.min(rules.entry.hoverY, s.y + rules.entry.speed * dt);
    return {
      state: { ...s, y, mode: y >= rules.entry.hoverY ? 'fighting' : 'entering' },
      volleys: [],
    };
  }
  const stage = finalStage(s);
  const st = rules.stages[stage];

  // The core's beam: charge (warning), fire, then rest. The boss holds still meanwhile.
  if (stage === 'core') {
    const beam = stepBeam(s.beam, rules.beam, dt);
    if (beam.mode !== 'idle' || s.beam.mode !== 'idle') {
      return { state: { ...s, beam }, volleys: [] };
    }
    s = { ...s, beam };
  }

  const t = s.t + dt;
  const sway = s.sway + dt * st.swayHz;
  const x = centerX + Math.sin(sway * 2 * Math.PI) * rules.swayAmplitude;
  let { cooldown, next, turn } = s;
  cooldown -= dt;
  const volleys: BossVolley[] = [];
  if (cooldown <= 0) {
    const attack = st.attacks[next % st.attacks.length];
    if (attack) {
      const from = shooter({ ...s, x }, rules, stage);
      volleys.push({ from, shots: attackShots(attack, aimRules(rules), from, target) });
    }
    next = (next + 1) % Math.max(1, st.attacks.length);
    turn += 1;
    // Carry the overshoot so attacks keep their rhythm whatever the frame rate.
    cooldown += st.cooldown;
  }
  return { state: { ...s, t, sway, x, cooldown, next, turn }, volleys };
}

/** The beam's cycle: idle for `every` seconds, then `warn`, then `fire`, then idle again. */
function stepBeam(
  beam: FinalBossState['beam'],
  rules: FinalBossRules['beam'],
  dt: number,
): FinalBossState['beam'] {
  const t = beam.t + dt;
  if (beam.mode === 'idle')
    return t >= rules.every ? { mode: 'warning', t: 0 } : { mode: 'idle', t };
  if (beam.mode === 'warning')
    return t >= rules.warn ? { mode: 'firing', t: 0 } : { mode: 'warning', t };
  return t >= rules.fire ? { mode: 'idle', t: 0 } : { mode: 'firing', t };
}

/**
 * `target` takes `amount` damage. Only a part whose stage has come can be
 * hurt; anything else (the hull, an armoured part) blocks the shot. A new
 * stage starts with its first attack after a full cooldown; the core's first
 * beam comes a full `beam.every` later.
 */
export function damageFinalBoss(
  s: FinalBossState,
  rules: FinalBossRules,
  target: FinalTarget,
  amount: number,
): { state: FinalBossState; destroyed: FinalPart | null; defeated: boolean } {
  if (amount < 0) throw new RangeError('damage must not be negative');
  if (target === 'hull' || !canHurt(s, target))
    return { state: s, destroyed: null, defeated: false };
  const hpLeft = Math.max(0, s.hp[target] - amount);
  const hp = { ...s.hp, [target]: hpLeft };
  if (hpLeft > 0) return { state: { ...s, hp }, destroyed: null, defeated: false };
  if (target === 'core') {
    return { state: { ...s, hp, mode: 'defeated' }, destroyed: 'core', defeated: true };
  }
  const before = finalStage(s);
  const after = finalStage({ ...s, hp });
  const state =
    after === before
      ? { ...s, hp }
      : {
          ...s,
          hp,
          next: 0,
          cooldown: rules.stages[after].cooldown,
          beam: { mode: 'idle' as const, t: 0 },
        };
  return { state, destroyed: target, defeated: false };
}
