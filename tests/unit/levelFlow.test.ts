import { describe, expect, it } from 'vitest';
import {
  panelShown,
  startFlow,
  stepFlow,
  type FlowInput,
  type FlowState,
} from '../../src/logic/levelFlow';

const rules = { bossAfter: 4, completeAfter: 2, autoNext: 6 };
const idle = { held: false, pressed: false };
const input = (over: Partial<FlowInput> = {}): FlowInput => ({
  wavesDone: false,
  bossDefeated: false,
  key: idle,
  ...over,
});

/** Runs `seconds` in 0.5 s steps; returns the last state and whether boss/next fired. */
function run(s: FlowState, seconds: number, inp: FlowInput) {
  let state = s;
  let startBoss = 0;
  let next = 0;
  for (let i = 0; i < seconds / 0.5; i++) {
    const step = stepFlow(state, 0.5, inp, rules);
    state = step.state;
    startBoss += Number(step.startBoss);
    next += Number(step.next);
  }
  return { state, startBoss, next };
}

describe('level flow', () => {
  it('plays the waves and stays there while waves are still coming', () => {
    const r = run(startFlow(), 60, input());
    expect(r.state.stage).toBe('waves');
    expect(r.startBoss).toBe(0);
  });

  it('brings the boss in once, bossAfter seconds after the last wave', () => {
    const before = run(startFlow(), 3.5, input({ wavesDone: true }));
    expect(before).toMatchObject({ startBoss: 0, state: { stage: 'waves' } });
    const after = run(before.state, 0.5, input({ wavesDone: true }));
    expect(after).toMatchObject({ startBoss: 1, state: { stage: 'boss' } });
    expect(run(after.state, 10, input({ wavesDone: true })).startBoss).toBe(0);
  });

  it('completes the level when the boss is defeated, showing the panel after the blast', () => {
    const boss = { stage: 'boss' as const, t: 0, armed: false };
    expect(run(boss, 20, input()).state.stage).toBe('boss');
    const done = stepFlow(boss, 0.5, input({ bossDefeated: true }), rules).state;
    expect(done.stage).toBe('complete');
    expect(panelShown(done, rules)).toBe(false);
    expect(panelShown(run(done, 2, input()).state, rules)).toBe(true);
  });

  it('moves on with a fresh key press once the panel is up', () => {
    const shown = run({ stage: 'complete', t: 0, armed: false }, 2, input()).state;
    const armed = stepFlow(shown, 0.1, input(), rules);
    expect(armed.state.armed).toBe(true);
    expect(armed.next).toBe(false);
    expect(
      stepFlow(armed.state, 0.1, input({ key: { held: true, pressed: true } }), rules).next,
    ).toBe(true);
  });

  it('ignores a key that was already held when the panel appeared', () => {
    const shown = run({ stage: 'complete', t: 0, armed: false }, 2, input()).state;
    const held = input({ key: { held: true, pressed: true } });
    const r = run({ ...shown, armed: false }, 3, held);
    expect(r.next).toBe(0);
    expect(r.state.armed).toBe(false);
  });

  it('a press before the panel appears does nothing', () => {
    const r = run(
      { stage: 'complete', t: 0, armed: false },
      1.5,
      input({ key: { held: false, pressed: true } }),
    );
    expect(r.next).toBe(0);
  });

  it('moves on by itself after autoNext seconds of the panel', () => {
    const r = run({ stage: 'complete', t: 0, armed: false }, 7.5, input());
    expect(r.next).toBe(0);
    expect(run(r.state, 0.5, input()).next).toBe(1);
  });

  it('with no auto-advance (the victory screen, M6.6) it waits for a fresh press', () => {
    const forever = { ...rules, autoNext: Infinity };
    let s: FlowState = { stage: 'complete', t: 0, armed: false };
    for (let i = 0; i < 1000; i++) {
      const step = stepFlow(s, 0.1, input(), forever);
      expect(step.next).toBe(false);
      s = step.state;
    }
    expect(s.t).toBeCloseTo(100, 6);
    const press = stepFlow(s, 0.1, input({ key: { held: true, pressed: true } }), forever);
    expect(press.next).toBe(true);
  });

  it('rejects negative time', () => {
    expect(() => stepFlow(startFlow(), -1, input(), rules)).toThrow(RangeError);
  });
});
