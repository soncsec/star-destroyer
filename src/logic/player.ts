/** Player movement and banking rules (engine-free, unit tested). */

export interface Axis {
  /** -1 = left, 0 = none, 1 = right */
  x: -1 | 0 | 1;
  /** -1 = up, 0 = none, 1 = down */
  y: -1 | 0 | 1;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PlayerState {
  x: number;
  y: number;
  /** Tilt from -1 (hard left) to 1 (hard right). */
  bank: number;
}

export interface MoveParams {
  speed: number;
  bankRate: number;
  bounds: Bounds;
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Moves toward `target` by at most `maxStep`. */
const approach = (value: number, target: number, maxStep: number): number =>
  value < target ? Math.min(target, value + maxStep) : Math.max(target, value - maxStep);

/** Advances the player by `dt` seconds of input. Returns a new state. */
export function stepPlayer(
  state: PlayerState,
  input: Axis,
  dt: number,
  p: MoveParams,
): PlayerState {
  const length = Math.hypot(input.x, input.y);
  const nx = length > 0 ? input.x / length : 0;
  const ny = length > 0 ? input.y / length : 0;
  return {
    x: clamp(state.x + nx * p.speed * dt, p.bounds.minX, p.bounds.maxX),
    y: clamp(state.y + ny * p.speed * dt, p.bounds.minY, p.bounds.maxY),
    bank: approach(state.bank, input.x, p.bankRate * dt),
  };
}

/** Bounds that keep a sprite of the given size fully on screen, with a margin. */
export function screenBounds(
  screenW: number,
  screenH: number,
  spriteW: number,
  spriteH: number,
  margin: number,
): Bounds {
  const halfW = spriteW / 2 + margin;
  const halfH = spriteH / 2 + margin;
  return { minX: halfW, maxX: screenW - halfW, minY: halfH, maxY: screenH - halfH };
}

/** Frames for [hard left, slight left, level, slight right, hard right]. */
export type BankFrames = readonly [number, number, number, number, number];

/** Sprite-sheet frame to show for a bank value, using the ship's own frame layout. */
export function bankFrame(bank: number, frames: BankFrames): number {
  return frames[2 + Math.round(clamp(bank, -1, 1) * 2)] as number;
}
