/**
 * Pause, quit and controls-legend rules (owner request 2026-10-17, ROADMAP C).
 * Plain TypeScript, no Phaser (ADR-006).
 *
 *   P / Esc  pause or resume (Esc also answers "no" to the quit question)
 *   Q        ask "QUIT TO ARCADE? Y / N"; Y quits, N (or Esc) goes back
 *   H        show or hide the controls legend
 *
 * Pausing is not possible after game over (nothing is running), but quitting is.
 */

export type Mode = 'playing' | 'paused' | 'confirmQuit';

export interface ControlState {
  mode: Mode;
  /** Where "no" returns to from the quit question. */
  resumeTo: 'playing' | 'paused';
  legend: boolean;
}

export type ControlKey = 'pause' | 'escape' | 'quit' | 'yes' | 'no' | 'help';

export const startControls = (showLegend: boolean): ControlState => ({
  mode: 'playing',
  resumeTo: 'playing',
  legend: showLegend,
});

/** Whether the world should advance this frame. */
export const running = (s: ControlState): boolean => s.mode === 'playing';

export function pressKey(
  s: ControlState,
  key: ControlKey,
  ctx: { gameOver: boolean },
): { state: ControlState; quit: boolean } {
  const stay = { state: s, quit: false };
  if (key === 'help') return { state: { ...s, legend: !s.legend }, quit: false };

  if (s.mode === 'confirmQuit') {
    if (key === 'yes') return { state: s, quit: true };
    if (key === 'no' || key === 'escape') return { state: { ...s, mode: s.resumeTo }, quit: false };
    return stay; // anything else waits for an answer
  }

  if (key === 'quit')
    return { state: { ...s, mode: 'confirmQuit', resumeTo: s.mode }, quit: false };
  if ((key === 'pause' || key === 'escape') && !ctx.gameOver) {
    return { state: { ...s, mode: s.mode === 'paused' ? 'playing' : 'paused' }, quit: false };
  }
  return stay;
}

/** Counts the start-of-game legend down; it hides itself after `seconds`. */
export function tickLegend(s: ControlState, shownFor: number, seconds: number): ControlState {
  return s.legend && shownFor >= seconds ? { ...s, legend: false } : s;
}
