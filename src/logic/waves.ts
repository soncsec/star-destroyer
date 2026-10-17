/**
 * Scripted waves (M2.4, ADR-012). Plain TypeScript, no Phaser (ADR-006).
 *
 * A wave script is a list of spawns at set times. The runner emits each spawn
 * once when its time comes, then (until levels end with a boss in M4) starts
 * the script over.
 */

export interface WaveSpawn<K extends string = string> {
  /** Seconds from the start of the script. */
  t: number;
  kind: K;
  /** Horizontal position as a fraction of the screen width, 0 (left) to 1 (right). */
  x: number;
}

export interface WaveRunner {
  /** Seconds into the current loop of the script. */
  time: number;
  /** Index of the next spawn to emit. */
  next: number;
  /** Completed loops. */
  loops: number;
}

export const startWaves = (): WaveRunner => ({ time: 0, next: 0, loops: 0 });

/**
 * Advances the script by `dt` seconds and returns every spawn that came due,
 * in order. After the last spawn and `loopGap` more seconds, the script
 * starts again from the top.
 */
export function stepWaves<K extends string>(
  runner: WaveRunner,
  script: readonly WaveSpawn<K>[],
  dt: number,
  loopGap: number,
): { runner: WaveRunner; spawns: WaveSpawn<K>[] } {
  if (dt < 0) throw new RangeError('dt must not be negative');
  if (script.length === 0) return { runner, spawns: [] };
  const spawns: WaveSpawn<K>[] = [];
  let { time, next, loops } = runner;
  time += dt;
  const length = (script[script.length - 1] as WaveSpawn<K>).t + loopGap;
  // A loop: emit what's due, wrap if the script (plus gap) is over, repeat.
  for (;;) {
    while (next < script.length && (script[next] as WaveSpawn<K>).t <= time) {
      spawns.push(script[next] as WaveSpawn<K>);
      next++;
    }
    if (next < script.length || time < length) break;
    time -= length;
    next = 0;
    loops++;
  }
  return { runner: { time, next, loops }, spawns };
}

// ---- Formation helpers: build a script from readable pieces ---------------------------

/** Enemies side by side at the same moment. */
export const line = <K extends string>(t: number, kind: K, xs: readonly number[]): WaveSpawn<K>[] =>
  xs.map((x) => ({ t, kind, x }));

/** Enemies one after another at the same x, `gap` seconds apart. */
export const column = <K extends string>(
  t: number,
  kind: K,
  x: number,
  count: number,
  gap: number,
): WaveSpawn<K>[] => Array.from({ length: count }, (_, i) => ({ t: t + i * gap, kind, x }));

/**
 * A V: the leader in the middle first, then pairs further out, each pair `gap`
 * seconds behind the last. `count` is odd: 1 leader + pairs.
 */
export function vee<K extends string>(
  t: number,
  kind: K,
  centre: number,
  count: number,
  spread: number,
  gap: number,
): WaveSpawn<K>[] {
  if (count < 1 || count % 2 === 0) throw new RangeError('a V needs an odd number of enemies');
  const out: WaveSpawn<K>[] = [{ t, kind, x: centre }];
  for (let i = 1; i <= (count - 1) / 2; i++) {
    out.push(
      { t: t + i * gap, kind, x: centre - i * spread },
      { t: t + i * gap, kind, x: centre + i * spread },
    );
  }
  return out;
}

/** Joins pieces into one script, ordered by time (stable for equal times). */
export const script = <K extends string>(...pieces: WaveSpawn<K>[][]): WaveSpawn<K>[] =>
  pieces.flat().sort((a, b) => a.t - b.t);

// ---- Checks for wave data (run by the level tests) ------------------------------------

export interface WaveLimits {
  /** Each kind's minimum and maximum allowed x fraction (keeps it on screen). */
  xRange: Record<string, { min: number; max: number }>;
  /** Seconds each kind stays on screen, roughly (for the crowd check). */
  screenTime: Record<string, number>;
  /** Most enemies allowed at once (the enemy pool size). */
  maxAtOnce: number;
}

/** Lists every problem in a wave script; empty means it's valid. */
export function checkWaves(spawns: readonly WaveSpawn[], limits: WaveLimits): string[] {
  const problems: string[] = [];
  spawns.forEach((s, i) => {
    const at = `spawn ${i + 1} (t=${s.t}, ${s.kind})`;
    if (!(s.t >= 0)) problems.push(`${at}: time must be 0 or more`);
    if (i > 0 && s.t < (spawns[i - 1] as WaveSpawn).t) problems.push(`${at}: out of time order`);
    const range = limits.xRange[s.kind];
    if (!range) problems.push(`${at}: unknown kind`);
    else if (!(s.x >= range.min && s.x <= range.max)) {
      problems.push(`${at}: x ${s.x} outside ${range.min.toFixed(3)}–${range.max.toFixed(3)}`);
    }
  });
  const crowd = mostAtOnce(spawns, limits.screenTime);
  if (crowd > limits.maxAtOnce) {
    problems.push(`up to ${crowd} enemies at once, more than the ${limits.maxAtOnce} allowed`);
  }
  return problems;
}

/** The most enemies on screen at the same time if none are shot down (worst case). */
export function mostAtOnce(
  spawns: readonly WaveSpawn[],
  screenTime: Record<string, number>,
): number {
  const edges: [number, number][] = [];
  for (const s of spawns) {
    edges.push([s.t, 1], [s.t + (screenTime[s.kind] ?? 0), -1]);
  }
  // Leaving before arriving at the same instant.
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let now = 0;
  let most = 0;
  for (const [, d] of edges) {
    now += d;
    most = Math.max(most, now);
  }
  return most;
}
