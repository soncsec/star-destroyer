/** Enemy rules (engine-free, unit tested). */

export interface DamageResult {
  hp: number;
  destroyed: boolean;
}

/** Applies damage. Health never goes below zero; zero means destroyed. */
export function applyDamage(hp: number, amount: number): DamageResult {
  if (amount < 0) throw new RangeError('damage must not be negative');
  const left = Math.max(0, hp - amount);
  return { hp: left, destroyed: left === 0 };
}

export interface SpawnResult {
  /** Seconds until the next spawn. */
  timeLeft: number;
  spawn: boolean;
}

/**
 * Counts down to the next spawn. Spawns at most one enemy per step, so a long frame
 * never drops a crowd of enemies at once.
 */
export function stepSpawner(timeLeft: number, dt: number, interval: number): SpawnResult {
  if (interval <= 0) throw new RangeError('spawn interval must be positive');
  const left = timeLeft - dt;
  if (left > 0) return { timeLeft: left, spawn: false };
  // Same rule as the weapon: only carry the overshoot if the timer ran down during this
  // step (capped at half an interval), never when it was already at zero.
  const carry = timeLeft > 0 ? Math.min(-left, interval / 2) : 0;
  return { timeLeft: interval - carry, spawn: true };
}
