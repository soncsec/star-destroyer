/**
 * The shield power-up (M3.3). Plain TypeScript, no Phaser (ADR-006).
 *
 * Owner decisions: blocks all damage for 30 seconds; picking up another
 * resets the timer to 30 s (it doesn't add up). It never outlasts its time
 * and, like every power-up, is gone on a new life or game.
 */

export interface ShieldRules {
  /** Seconds of protection per pickup. */
  duration: number;
  /** The bubble blinks during the last this-many seconds as a warning. */
  warnAt: number;
}

/** Seconds of shield left; 0 = no shield. */
export type Shield = number;

export const collectShield = (_now: Shield, rules: ShieldRules): Shield => rules.duration;

export function tickShield(s: Shield, dt: number): Shield {
  if (dt < 0) throw new RangeError('dt must not be negative');
  return Math.max(0, s - dt);
}

export const shieldUp = (s: Shield): boolean => s > 0;

/** Whole seconds to show in the HUD (rounded up, so it reads 30 … 1). */
export const shieldSeconds = (s: Shield): number => Math.ceil(s);

/** Whether the bubble is drawn this frame: steady, then blinking near the end. */
export function bubbleVisible(s: Shield, rules: ShieldRules, blinkHz: number): boolean {
  if (s <= 0) return false;
  if (s > rules.warnAt) return true;
  return Math.floor(s * blinkHz * 2) % 2 === 0;
}
