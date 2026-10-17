/** Fire-rate rules (engine-free, unit tested). */

export interface FireState {
  /** Seconds until the next shot is allowed. Zero or less means ready. */
  cooldown: number;
}

export interface FireResult {
  state: FireState;
  /** Whether a shot is fired this step. */
  fire: boolean;
}

/**
 * Advances the weapon by `dt` seconds. Pressing fire shoots straight away if the weapon is ready;
 * holding it shoots every `interval` seconds. A long frame never fires a burst of catch-up shots.
 */
export function stepFire(
  state: FireState,
  held: boolean,
  dt: number,
  interval: number,
): FireResult {
  const cooldown = state.cooldown - dt;
  if (held && cooldown <= 0) {
    // If the weapon only became ready during this step, carry the overshoot into the next
    // cooldown so held fire keeps an even rhythm at any frame rate. Capped at half an
    // interval, and nothing is carried when the weapon was already idle and ready.
    const carry = state.cooldown > 0 ? Math.min(-cooldown, interval / 2) : 0;
    return { state: { cooldown: interval - carry }, fire: true };
  }
  return { state: { cooldown: Math.max(cooldown, 0) }, fire: false };
}
