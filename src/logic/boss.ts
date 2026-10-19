/**
 * Boss rules (M4.3). Plain TypeScript, no Phaser (ADR-006).
 *
 * A boss flies in from above to its hover height (it can't be hurt while
 * entering), then sways from side to side and attacks. Its health decides its
 * phase: each phase has its own attacks and pace, so it gets harder as it
 * weakens. At 0 health it is defeated.
 *
 * A twin boss (M6.4) is two of the same ship side by side, each with its own
 * health; they sway as mirror images. After either attacks, the other waits
 * at least half a cooldown, so their volleys never land together and each
 * fan's gap check still holds.
 */
import { aimDown, type Vec } from './enemyFire';

export type BossAttack =
  /** One shot at the ship (turned at most `maxAimAngleDeg` from straight down). */
  | { kind: 'aimed' }
  /** `shots` shots spread evenly over `spreadDeg`, centered on straight down. */
  | { kind: 'fan'; shots: number; spreadDeg: number };

export interface BossPhase {
  /** This phase starts once health falls to this fraction (the first phase: 1). */
  fromHp: number;
  /** Attacks used in turn, one per `cooldown` seconds. */
  attacks: readonly BossAttack[];
  cooldown: number;
  /** Side-to-side sways per second. */
  swayHz: number;
}

export interface BossRules {
  hp: number;
  points: number;
  /** Flies in from `startY` to `hoverY` at `speed` pixels per second. */
  entry: { startY: number; hoverY: number; speed: number };
  /** How far it sways either side of the screen's center, in pixels. */
  swayAmplitude: number;
  phases: readonly BossPhase[];
  /** Shots leave from this far below the boss's center. */
  muzzleOffsetY: number;
  shotSpeed: number;
  maxAimAngleDeg: number;
  /** Two of this ship, centered `offsetX` either side of the screen's center. */
  twin?: { offsetX: number };
}

/** Where each ship of a boss starts: its sway center, sway direction and attack delay. */
export interface BossSlot {
  centerX: number;
  /** 1 sways right first, -1 left (the mirror image). */
  side: 1 | -1;
  /** Extra seconds before its first attack. */
  delay: number;
}

/** The ships that make up a boss: one, or a mirrored, staggered pair. */
export function bossLineup(rules: BossRules, screenCenterX: number): BossSlot[] {
  if (!rules.twin) return [{ centerX: screenCenterX, side: 1, delay: 0 }];
  const { offsetX } = rules.twin;
  if (offsetX <= 0) throw new RangeError('twin offsetX must be positive');
  const first = rules.phases[0];
  if (!first) throw new RangeError('a boss needs at least one phase');
  return [
    { centerX: screenCenterX - offsetX, side: 1, delay: 0 },
    { centerX: screenCenterX + offsetX, side: -1, delay: first.cooldown / 2 },
  ];
}

/** Health across every ship of the boss. */
export const bossTotalHp = (rules: BossRules): number => rules.hp * (rules.twin ? 2 : 1);

export type BossMode = 'entering' | 'fighting' | 'defeated';

export interface BossState {
  mode: BossMode;
  x: number;
  y: number;
  hp: number;
  phase: number;
  /** Seconds spent fighting (drives the sway). */
  t: number;
  /** Sway direction: 1, or -1 for the mirror image (a twin). */
  side: 1 | -1;
  /** Seconds until the next attack. */
  cooldown: number;
  /** Which of the phase's attacks comes next. */
  next: number;
}

/**
 * A boss appearing above the screen, centered on `centerX`, swaying the
 * `side` way first, with `delay` extra seconds before its first attack.
 */
export function startBoss(
  rules: BossRules,
  centerX: number,
  side: 1 | -1 = 1,
  delay = 0,
): BossState {
  if (delay < 0) throw new RangeError('delay must not be negative');
  if (rules.hp <= 0) throw new RangeError('hp must be positive');
  if (rules.phases[0]?.fromHp !== 1)
    throw new RangeError('the first phase must start at full health');
  return {
    mode: 'entering',
    x: centerX,
    y: rules.entry.startY,
    hp: rules.hp,
    phase: 0,
    t: 0,
    side,
    cooldown: rules.phases[0].cooldown + delay,
    next: 0,
  };
}

/** The phase that applies at this health: the last one whose threshold has been reached. */
function phaseAt(hp: number, rules: BossRules): { index: number; cooldown: number } {
  const fraction = hp / rules.hp;
  let found = { index: 0, cooldown: 0 };
  rules.phases.forEach((p, i) => {
    if (fraction <= p.fromHp) found = { index: i, cooldown: p.cooldown };
  });
  return found;
}

/** Which phase applies at this health (0 = the first). */
export const phaseFor = (hp: number, rules: BossRules): number => phaseAt(hp, rules).index;

/** Shot velocities for one attack, fired from `from` with the ship at `target`. */
export function attackShots(attack: BossAttack, rules: BossRules, from: Vec, target: Vec): Vec[] {
  if (attack.kind === 'aimed') {
    return [aimDown(from, target, rules.shotSpeed, rules.maxAimAngleDeg)];
  }
  if (attack.shots < 1) throw new RangeError('a fan needs at least one shot');
  // One shot goes straight down; more are spread evenly across the fan.
  const step = attack.shots > 1 ? attack.spreadDeg / (attack.shots - 1) : 0;
  const first = attack.shots > 1 ? -attack.spreadDeg / 2 : 0;
  return Array.from({ length: attack.shots }, (_, i) => {
    const rad = ((first + i * step) * Math.PI) / 180;
    return { x: Math.sin(rad) * rules.shotSpeed, y: Math.cos(rad) * rules.shotSpeed };
  });
}

/**
 * Smallest horizontal space between neighbouring shots of a fan, `distance`
 * pixels below where they were fired, minus the shots' own width.
 * Infinity for a single shot (nothing to squeeze between).
 */
export function fanGap(
  attack: Extract<BossAttack, { kind: 'fan' }>,
  distance: number,
  shotWidth: number,
): number {
  if (attack.shots < 2) return Infinity;
  const step = attack.spreadDeg / (attack.shots - 1);
  let gap = Infinity;
  for (let i = 0; i < attack.shots - 1; i++) {
    const a = ((-attack.spreadDeg / 2 + i * step) * Math.PI) / 180;
    const b = a + (step * Math.PI) / 180;
    gap = Math.min(gap, distance * (Math.tan(b) - Math.tan(a)) - shotWidth);
  }
  return gap;
}

/**
 * Advances the boss by `dt` seconds. Returns its new state and the velocities
 * of any shots it fires this step (from its muzzle).
 */
export function stepBoss(
  s: BossState,
  rules: BossRules,
  dt: number,
  target: Vec,
  centerX: number,
): { state: BossState; shots: Vec[] } {
  if (dt < 0) throw new RangeError('dt must not be negative');
  if (s.mode === 'defeated') return { state: s, shots: [] };
  if (s.mode === 'entering') {
    const y = Math.min(rules.entry.hoverY, s.y + rules.entry.speed * dt);
    const mode: BossMode = y >= rules.entry.hoverY ? 'fighting' : 'entering';
    return { state: { ...s, y, mode }, shots: [] };
  }
  const phase = rules.phases[s.phase];
  if (!phase) throw new RangeError(`no phase ${s.phase}`);
  const t = s.t + dt;
  const x = centerX + s.side * Math.sin(t * phase.swayHz * 2 * Math.PI) * rules.swayAmplitude;
  let cooldown = s.cooldown - dt;
  let next = s.next;
  let shots: Vec[] = [];
  if (cooldown <= 0) {
    const attack = phase.attacks[next % phase.attacks.length];
    if (attack) {
      const from = { x, y: s.y + rules.muzzleOffsetY };
      shots = attackShots(attack, rules, from, target);
    }
    next = (next + 1) % Math.max(1, phase.attacks.length);
    // Carry the overshoot so attacks keep their rhythm whatever the frame rate.
    cooldown += phase.cooldown;
  }
  return { state: { ...s, t, x, cooldown, next }, shots };
}

/** Shots one ship of a boss fires in a step: where from, and their velocities. */
export interface BossVolley {
  from: Vec;
  shots: Vec[];
}

/**
 * Advances every ship of a boss by `dt` (one ship, or a twin pair placed by
 * `bossLineup`). When a ship attacks, the ships after it in this step, and all
 * of them next time, wait at least half that ship's cooldown before attacking.
 */
export function stepBossGroup(
  parts: readonly BossState[],
  rules: BossRules,
  dt: number,
  target: Vec,
  slots: readonly BossSlot[],
): { parts: BossState[]; volleys: BossVolley[] } {
  if (slots.length !== parts.length) throw new RangeError('one slot per ship');
  const out = [...parts];
  const volleys: BossVolley[] = [];
  out.forEach((part, i) => {
    const step = stepBoss(part, rules, dt, target, (slots[i] as BossSlot).centerX);
    out[i] = step.state;
    if (step.shots.length === 0) return;
    volleys.push({
      from: { x: step.state.x, y: step.state.y + rules.muzzleOffsetY },
      shots: step.shots,
    });
    const wait = (rules.phases[step.state.phase] as BossPhase).cooldown / 2;
    out.forEach((other, j) => {
      if (j !== i && other.mode === 'fighting' && other.cooldown < wait)
        out[j] = { ...other, cooldown: wait };
    });
  });
  return { parts: out, volleys };
}

/**
 * The boss takes `amount` damage. Nothing happens while it is entering or
 * already defeated. A new phase starts with its first attack after a full
 * cooldown.
 */
export function damageBoss(
  s: BossState,
  rules: BossRules,
  amount: number,
): { state: BossState; defeated: boolean } {
  if (amount < 0) throw new RangeError('damage must not be negative');
  if (s.mode !== 'fighting') return { state: s, defeated: false };
  const hp = Math.max(0, s.hp - amount);
  if (hp === 0) return { state: { ...s, hp, mode: 'defeated' }, defeated: true };
  const phase = phaseAt(hp, rules);
  if (phase.index === s.phase) return { state: { ...s, hp }, defeated: false };
  return {
    state: { ...s, hp, phase: phase.index, next: 0, cooldown: phase.cooldown },
    defeated: false,
  };
}

/** The health bar's fill, 0 to 1. */
export const bossHealth = (s: BossState, rules: BossRules): number => s.hp / rules.hp;
