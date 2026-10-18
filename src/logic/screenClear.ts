/** Screen-clear power-up rules (M3.4; engine-free, unit tested). */
import { offScreen, type Box } from './collision';

/** Something the screen clear may destroy: its hitbox and what it scores. */
export interface ClearTarget {
  box: Box;
  points: number;
}

export interface ClearResult {
  /** Indexes (into the targets given) of everything destroyed. */
  destroyed: number[];
  /** Points scored for them. */
  points: number;
}

/**
 * The screen clear destroys every target that is at least partly on screen.
 * Anything still completely off screen (waiting above the top) survives.
 */
export function screenClear(
  targets: readonly ClearTarget[],
  screenW: number,
  screenH: number,
): ClearResult {
  const destroyed: number[] = [];
  let points = 0;
  targets.forEach((t, i) => {
    if (offScreen(t.box, screenW, screenH)) return;
    destroyed.push(i);
    points += t.points;
  });
  return { destroyed, points };
}
