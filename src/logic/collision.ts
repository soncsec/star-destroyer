/** Collision shapes and tests (engine-free, unit tested). */

/** An axis-aligned box given by its center and full size, in screen pixels. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Whether two boxes overlap. Boxes that only touch edges don't count. */
export function overlaps(a: Box, b: Box): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

/** Whether a box is completely outside the screen. */
export function offScreen(box: Box, screenW: number, screenH: number): boolean {
  return (
    box.x + box.w / 2 < 0 ||
    box.x - box.w / 2 > screenW ||
    box.y + box.h / 2 < 0 ||
    box.y - box.h / 2 > screenH
  );
}

/** Index of the first box in `candidates` that overlaps `target`, or -1 if none does. */
export function firstHit(target: Box, candidates: readonly Box[]): number {
  return candidates.findIndex((c) => overlaps(target, c));
}
