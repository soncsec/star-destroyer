/**
 * Touchscreen steering (owner request 2026-10-18: play on phones and tablets
 * too). Plain TypeScript, no Phaser (ADR-006).
 *
 * Drag anywhere: the ship moves the way the finger moves, keeping its
 * distance, so the finger never covers it. The ship flies toward that point
 * at its normal top speed, so touch is no faster than the keyboard.
 */
import type { Vec } from './enemyFire';
import type { Bounds, MoveParams, PlayerState } from './player';

/** Where the finger and the ship were when the drag began. */
export interface Drag {
  finger: Vec;
  ship: Vec;
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Where the ship should be for the finger at `finger`: its start, moved as far as the finger has. */
export function dragTarget(drag: Drag, finger: Vec, bounds: Bounds): Vec {
  return {
    x: clamp(drag.ship.x + finger.x - drag.finger.x, bounds.minX, bounds.maxX),
    y: clamp(drag.ship.y + finger.y - drag.finger.y, bounds.minY, bounds.maxY),
  };
}

/** Sideways movement smaller than this (pixels) doesn't bank the ship. */
const BANK_DEADZONE = 0.5;

/**
 * Moves the ship toward `target` by at most its top speed for `dt` seconds,
 * banking the way it moves (as the keyboard does).
 */
export function stepPlayerToward(
  state: PlayerState,
  target: Vec,
  dt: number,
  p: MoveParams,
): PlayerState {
  if (dt < 0) throw new RangeError('dt must not be negative');
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const dist = Math.hypot(dx, dy);
  const reach = p.speed * dt;
  const k = dist <= reach || dist === 0 ? 1 : reach / dist;
  const lean = Math.abs(dx) > BANK_DEADZONE ? Math.sign(dx) : 0;
  const bankStep = p.bankRate * dt;
  const bank =
    state.bank < lean
      ? Math.min(lean, state.bank + bankStep)
      : Math.max(lean, state.bank - bankStep);
  return {
    x: clamp(state.x + dx * k, p.bounds.minX, p.bounds.maxX),
    y: clamp(state.y + dy * k, p.bounds.minY, p.bounds.maxY),
    bank,
  };
}
