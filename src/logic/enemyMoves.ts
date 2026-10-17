/**
 * Enemy movement patterns (M2.3). Plain TypeScript, no Phaser (ADR-006).
 *
 * - straight: flies straight down.
 * - weave: descends while swaying side to side around its spawn x.
 * - dive: flies in to a hover line, waits, then dives toward where the ship
 *   was at that moment (it doesn't steer after that, so the ship can dodge).
 */

export type MovePattern =
  | { kind: 'straight'; speed: number }
  | { kind: 'weave'; speed: number; amplitude: number; period: number }
  | { kind: 'dive'; enterSpeed: number; hoverY: number; hoverTime: number; diveSpeed: number };

export interface MoveState {
  x: number;
  y: number;
  /** Seconds since spawn. */
  t: number;
  /** Centre line for weaving. */
  x0: number;
  phase: 'enter' | 'hover' | 'dive';
  /** Seconds left hovering. */
  hoverLeft: number;
  /** Dive velocity, fixed when the dive starts. */
  vx: number;
  vy: number;
}

export function startMove(pattern: MovePattern, x: number, y: number): MoveState {
  const hoverLeft = pattern.kind === 'dive' ? pattern.hoverTime : 0;
  return { x, y, t: 0, x0: x, phase: 'enter', hoverLeft, vx: 0, vy: 0 };
}

/**
 * Advances an enemy by `dt` seconds. `target` is the ship's position, used
 * only at the moment a diver starts its dive.
 */
export function stepMove(
  pattern: MovePattern,
  s: MoveState,
  dt: number,
  target: { x: number; y: number },
): MoveState {
  if (dt < 0) throw new RangeError('dt must not be negative');
  const t = s.t + dt;
  switch (pattern.kind) {
    case 'straight':
      return { ...s, t, y: s.y + pattern.speed * dt };
    case 'weave':
      return {
        ...s,
        t,
        y: s.y + pattern.speed * dt,
        x: s.x0 + pattern.amplitude * Math.sin((2 * Math.PI * t) / pattern.period),
      };
    case 'dive': {
      if (s.phase === 'enter') {
        const y = s.y + pattern.enterSpeed * dt;
        return y < pattern.hoverY ? { ...s, t, y } : { ...s, t, y: pattern.hoverY, phase: 'hover' };
      }
      if (s.phase === 'hover') {
        const hoverLeft = s.hoverLeft - dt;
        if (hoverLeft > 0) return { ...s, t, hoverLeft };
        const dx = target.x - s.x;
        // Always dive downward, even if the ship is level with or above the diver.
        const dy = Math.max(target.y - s.y, 1);
        const len = Math.hypot(dx, dy);
        return {
          ...s,
          t,
          hoverLeft: 0,
          phase: 'dive',
          vx: (dx / len) * pattern.diveSpeed,
          vy: (dy / len) * pattern.diveSpeed,
        };
      }
      return { ...s, t, x: s.x + s.vx * dt, y: s.y + s.vy * dt };
    }
  }
}

/** The narrowest x range a pattern needs to spawn in so it never leaves the screen sideways. */
export function spawnMargin(pattern: MovePattern, halfWidth: number): number {
  return halfWidth + (pattern.kind === 'weave' ? pattern.amplitude : 0) + 4;
}
