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

/**
 * Picks a key with probability proportional to its weight (used for power-up
 * drop rarity in M3.1), using a number in
 * [0, 1) from the seeded RNG. Keys with zero weight are never picked.
 */
export function pickWeighted<K extends string>(
  weights: Readonly<Record<K, number>>,
  roll: number,
): K {
  if (roll < 0 || roll >= 1) throw new RangeError('roll must be in [0, 1)');
  const entries = Object.entries(weights) as [K, number][];
  if (entries.some(([, w]) => w < 0)) throw new RangeError('weights must not be negative');
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) throw new RangeError('at least one weight must be positive');
  const positive = entries.filter(([, w]) => w > 0);
  const [lastKey] = positive[positive.length - 1] as [K, number];
  let threshold = roll * total;
  // Every key but the last claims its share; whatever is left (including any
  // floating-point remainder) belongs to the last positive weight.
  for (const [key, w] of positive.slice(0, -1)) {
    if (threshold < w) return key;
    threshold -= w;
  }
  return lastKey;
}
