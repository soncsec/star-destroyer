/**
 * Game-over screen timing and restart input (M2.7). Plain TypeScript, no
 * Phaser (ADR-006).
 *
 * The panel appears `showAfter` seconds after the last life is lost (time
 * for the explosion). A restart needs a *fresh* key press after that: the
 * key must be seen up at least once first, so a player still holding fire
 * when they die doesn't restart by accident.
 *
 * Input each step: `held` (a restart key is down now) and `pressed` (a new
 * press happened since the last step). `pressed` catches a quick tap that
 * goes down and up between two frames, which `held` alone would miss.
 */

export interface RestartInput {
  held: boolean;
  pressed: boolean;
}

export interface GameOverRules {
  /** Seconds from the last hit to the panel appearing. */
  showAfter: number;
}

export interface GameOverState {
  /** Seconds since the game ended. */
  t: number;
  /** True once the restart key has been seen up after the panel appeared. */
  armed: boolean;
}

export const startGameOver = (): GameOverState => ({ t: 0, armed: false });

/** Whether the game-over panel is showing. */
export const panelShown = (s: GameOverState, rules: GameOverRules): boolean =>
  s.t >= rules.showAfter;

export function stepGameOver(
  s: GameOverState,
  dt: number,
  input: RestartInput,
  rules: GameOverRules,
): { state: GameOverState; restart: boolean } {
  if (dt < 0) throw new RangeError('dt must not be negative');
  const t = s.t + dt;
  if (t < rules.showAfter) return { state: { t, armed: false }, restart: false };
  if (!s.armed) return { state: { t, armed: !input.held }, restart: false };
  return { state: { t, armed: true }, restart: input.pressed };
}
