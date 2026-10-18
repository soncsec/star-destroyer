/**
 * How a level runs from start to finish (M4.4). Plain TypeScript, no Phaser
 * (ADR-006).
 *
 * 1. waves: the level's wave script plays once;
 * 2. after the last wave and `bossAfter` seconds of quiet, the boss comes in;
 * 3. once the boss is defeated (and its explosion has had `completeAfter`
 *    seconds), the level-complete panel shows;
 * 4. a fresh Space or Enter press, or `autoNext` seconds, moves on.
 * A press only counts once the key has been seen up after the panel
 * appeared, so a player holding fire doesn't skip the panel by accident.
 */
import type { RestartInput } from './gameOver';

export type FlowStage = 'waves' | 'boss' | 'complete';

export interface FlowRules {
  /** Seconds of quiet after the last wave before the boss comes in. */
  bossAfter: number;
  /** Seconds from the boss's defeat to the panel (lets the blast play). */
  completeAfter: number;
  /** Seconds the panel shows before moving on by itself. */
  autoNext: number;
}

export interface FlowState {
  stage: FlowStage;
  /** Seconds in this stage (in 'waves': since the last wave was sent). */
  t: number;
  /** In 'complete': true once the key has been seen up after the panel appeared. */
  armed: boolean;
}

export const startFlow = (): FlowState => ({ stage: 'waves', t: 0, armed: false });

export interface FlowInput {
  /** The wave script has sent its last spawn. */
  wavesDone: boolean;
  /** The boss has been defeated. */
  bossDefeated: boolean;
  /** Space or Enter. */
  key: RestartInput;
}

export interface FlowStep {
  state: FlowState;
  /** Bring in the boss now. */
  startBoss: boolean;
  /** Go on to the next level now. */
  next: boolean;
}

/** Whether the level-complete panel is on screen. */
export const panelShown = (s: FlowState, rules: FlowRules): boolean =>
  s.stage === 'complete' && s.t >= rules.completeAfter;

export function stepFlow(s: FlowState, dt: number, input: FlowInput, rules: FlowRules): FlowStep {
  if (dt < 0) throw new RangeError('dt must not be negative');
  const stay = (state: FlowState): FlowStep => ({ state, startBoss: false, next: false });
  switch (s.stage) {
    case 'waves': {
      if (!input.wavesDone) return stay(s);
      const t = s.t + dt;
      if (t < rules.bossAfter) return stay({ ...s, t });
      return { state: { stage: 'boss', t: 0, armed: false }, startBoss: true, next: false };
    }
    case 'boss':
      if (!input.bossDefeated) return stay({ ...s, t: s.t + dt });
      return stay({ stage: 'complete', t: 0, armed: false });
    case 'complete': {
      const t = s.t + dt;
      const shown = t >= rules.completeAfter;
      if (!shown) return stay({ ...s, t });
      if (t >= rules.completeAfter + rules.autoNext)
        return { state: { ...s, t }, startBoss: false, next: true };
      if (!s.armed) return stay({ ...s, t, armed: !input.key.held });
      return { state: { ...s, t }, startBoss: false, next: input.key.pressed };
    }
  }
}
