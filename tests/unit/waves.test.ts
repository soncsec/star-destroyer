import { describe, expect, it } from 'vitest';
import {
  checkWaves,
  column,
  line,
  mostAtOnce,
  script,
  startWaves,
  stepWaves,
  vee,
  type WaveSpawn,
} from '../../src/logic/waves';

const s = script(line(0, 'a', [0.3, 0.7]), column(2, 'b', 0.5, 2, 1));
// t: 0 a .3, 0 a .7, 2 b .5, 3 b .5

/** Runs the script for `seconds` in steps of `dt`, collecting spawn times (with loop offset). */
function runFor(seconds: number, dt: number, loopGap = 1): number[] {
  let r = startWaves();
  const times: number[] = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    const step = stepWaves(r, s, dt, loopGap);
    for (const sp of step.spawns) times.push(sp.t);
    r = step.runner;
  }
  return times;
}

describe('stepWaves', () => {
  it('emits each spawn once, when its time comes, in order', () => {
    let r = startWaves();
    const at = (dt: number) => {
      const step = stepWaves(r, s, dt, 1);
      r = step.runner;
      return step.spawns.map((x) => `${x.kind}${x.x}`);
    };
    expect(at(0)).toEqual(['a0.3', 'a0.7']);
    expect(at(1.9)).toEqual([]);
    expect(at(0.2)).toEqual(['b0.5']);
    expect(at(0.5)).toEqual([]);
    expect(at(0.5)).toEqual(['b0.5']);
  });

  it('a long frame emits everything that came due, nothing twice', () => {
    const step = stepWaves(startWaves(), s, 3.5, 100);
    expect(step.spawns).toHaveLength(4);
    expect(stepWaves(step.runner, s, 1, 100).spawns).toEqual([]);
  });

  it('starts the script over after the last spawn plus the gap', () => {
    let r = startWaves();
    r = stepWaves(r, s, 3, 1).runner; // all 4 spawned, script length 3 + 1 = 4
    expect(r).toMatchObject({ next: 4, loops: 0 });
    const wrap = stepWaves(r, s, 1.25, 1); // passes t=4: wraps, emits the t=0 pair
    expect(wrap.runner.loops).toBe(1);
    expect(wrap.spawns.map((x) => x.t)).toEqual([0, 0]);
    expect(wrap.runner.time).toBeCloseTo(0.25);
  });

  it('gives the same spawns at any frame rate', () => {
    // 18.5 s is between spawns (the script repeats every 4 s), so step rounding
    // can't decide whether a spawn exactly on the edge is included.
    const slow = runFor(18.5, 1 / 30);
    expect(slow).toHaveLength(19); // 4 full loops of 4 spawns, then the t=0 pair and t=2
    expect(runFor(18.5, 1 / 144)).toEqual(slow);
  });

  it('does nothing with an empty script, and rejects negative time', () => {
    expect(stepWaves(startWaves(), [], 5, 1).spawns).toEqual([]);
    expect(() => stepWaves(startWaves(), s, -1, 1)).toThrow(RangeError);
  });
});

describe('formations', () => {
  it('line puts enemies side by side at one time', () => {
    expect(line(5, 'g', [0.2, 0.8])).toEqual([
      { t: 5, kind: 'g', x: 0.2 },
      { t: 5, kind: 'g', x: 0.8 },
    ]);
  });
  it('column spaces enemies in time at one x', () => {
    expect(column(1, 'g', 0.5, 3, 0.5).map((x) => x.t)).toEqual([1, 1.5, 2]);
  });
  it('vee leads with the centre, then pairs further out and later', () => {
    expect(vee(0, 'g', 0.5, 5, 0.15, 0.4)).toEqual([
      { t: 0, kind: 'g', x: 0.5 },
      { t: 0.4, kind: 'g', x: 0.35 },
      { t: 0.4, kind: 'g', x: 0.65 },
      { t: 0.8, kind: 'g', x: 0.2 },
      { t: 0.8, kind: 'g', x: 0.8 },
    ]);
    expect(() => vee(0, 'g', 0.5, 4, 0.1, 1)).toThrow(RangeError);
  });
  it('script joins pieces in time order', () => {
    expect(script(line(3, 'a', [0.5]), line(1, 'b', [0.5])).map((x) => x.kind)).toEqual(['b', 'a']);
  });
});

describe('checkWaves', () => {
  const limits = {
    xRange: { a: { min: 0.1, max: 0.9 }, b: { min: 0.2, max: 0.8 } },
    screenTime: { a: 5, b: 5 },
    maxAtOnce: 4,
  };

  it('accepts a valid script', () => {
    expect(checkWaves(s, limits)).toEqual([]);
  });

  it('reports time order, bad times, unknown kinds and positions off screen', () => {
    const bad: WaveSpawn[] = [
      { t: 2, kind: 'a', x: 0.5 },
      { t: 1, kind: 'a', x: 0.5 },
      { t: -1, kind: 'a', x: 0.5 },
      { t: 3, kind: 'z', x: 0.5 },
      { t: 4, kind: 'b', x: 0.95 },
    ];
    const p = checkWaves(bad, limits);
    expect(p).toContain('spawn 2 (t=1, a): out of time order');
    expect(p.some((x) => x.startsWith('spawn 3 (t=-1, a): time must be 0 or more'))).toBe(true);
    expect(p).toContain('spawn 4 (t=3, z): unknown kind');
    expect(p).toContain('spawn 5 (t=4, b): x 0.95 outside 0.200–0.800');
  });

  it('reports a crowd bigger than the enemy pool', () => {
    const crowd = line(0, 'a', [0.2, 0.3, 0.4, 0.5, 0.6]);
    expect(checkWaves(crowd, limits)).toEqual(['up to 5 enemies at once, more than the 4 allowed']);
  });
});

describe('mostAtOnce', () => {
  it('counts overlapping screen time', () => {
    const t = { a: 2 };
    expect(mostAtOnce(column(0, 'a', 0.5, 3, 1), t)).toBe(2); // 0–2, 1–3, 2–4
    expect(mostAtOnce(column(0, 'a', 0.5, 3, 2), t)).toBe(1); // back to back
    expect(mostAtOnce([], t)).toBe(0);
  });
});
