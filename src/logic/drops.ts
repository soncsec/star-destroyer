/**
 * Power-up drops (M3.1). Plain TypeScript, no Phaser (ADR-006).
 *
 * Each kill may drop one pickup: first a roll against the drop chance, then a
 * weighted pick of the kind (owner decisions: weapon common, shield uncommon,
 * screen clear rare; health uncommon since M7.18). The screen clear and the
 * health gem are never dropped during a boss fight.
 */
import { pickWeighted } from './enemy';
import type { Rng } from './rng';

export type PowerUpKind = 'weapon' | 'shield' | 'clear' | 'health';

export interface DropRules {
  /** Chance (0 to 1) that a kill drops anything at all. */
  chance: number;
  /** Relative chance of each kind, given a drop. */
  weights: Readonly<Record<PowerUpKind, number>>;
}

/** What a kill drops, or null for nothing. Uses two numbers from the seeded RNG. */
export function rollDrop(
  rng: Rng,
  rules: DropRules,
  ctx: { bossFight: boolean },
): PowerUpKind | null {
  if (!(rules.chance >= 0 && rules.chance <= 1)) throw new RangeError('chance must be 0 to 1');
  const dropRoll = rng.next();
  const kindRoll = rng.next(); // always drawn, so the RNG stays in step either way
  if (dropRoll >= rules.chance) return null;
  const weights = ctx.bossFight ? { ...rules.weights, clear: 0, health: 0 } : rules.weights;
  return pickWeighted(weights, kindRoll);
}
