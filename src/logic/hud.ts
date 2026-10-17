/** What the HUD shows (M2.6). Plain TypeScript, no Phaser (ADR-006). */

/** Score as six zero-padded digits, capped at 999999. */
export function formatScore(score: number, digits = 6): string {
  if (!Number.isFinite(score) || score < 0) throw new RangeError('score must be 0 or more');
  const max = 10 ** digits - 1;
  return String(Math.min(Math.floor(score), max)).padStart(digits, '0');
}

/** One pip per hit the ship can still take this life: true = still there. */
export function healthPips(hits: number, hitsPerLife: number): boolean[] {
  if (hitsPerLife < 1) throw new RangeError('hitsPerLife must be at least 1');
  const left = Math.max(0, Math.min(hitsPerLife, hitsPerLife - hits));
  return Array.from({ length: hitsPerLife }, (_, i) => i < left);
}
