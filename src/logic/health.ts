/**
 * Player health and lives (M2.1). Plain TypeScript, no Phaser (ADR-006).
 *
 * The player has a number of lives; each life absorbs a number of hits.
 * After a hit the ship is briefly invulnerable so one collision counts once;
 * after losing a life it respawns invulnerable (and flashing) for longer.
 */

export interface HealthRules {
  /** Hits that end one life (owner decision: 5). */
  hitsPerLife: number;
  /** Lives at the start (owner decision: 3). */
  lives: number;
  /** Invulnerable seconds after a hit that doesn't cost a life. */
  hitInvulnerable: number;
  /** Invulnerable seconds after respawning. */
  respawnInvulnerable: number;
}

export interface Health {
  /** Hits taken in the current life (0 to hitsPerLife - 1 while alive). */
  hits: number;
  /** Lives left, including the current one. 0 means game over. */
  lives: number;
  /** Seconds of invulnerability left. */
  invulnerable: number;
}

/** What a hit did. */
export type HitResult = 'ignored' | 'hit' | 'lifeLost' | 'gameOver';

export function newHealth(rules: HealthRules): Health {
  if (rules.hitsPerLife < 1 || rules.lives < 1)
    throw new RangeError('need at least 1 hit and 1 life');
  return { hits: 0, lives: rules.lives, invulnerable: 0 };
}

export const isGameOver = (h: Health): boolean => h.lives <= 0;

/** Applies one hit. Hits while invulnerable or after game over are ignored. */
export function takeHit(h: Health, rules: HealthRules): { health: Health; result: HitResult } {
  if (isGameOver(h) || h.invulnerable > 0) return { health: h, result: 'ignored' };
  const hits = h.hits + 1;
  if (hits < rules.hitsPerLife) {
    return { health: { ...h, hits, invulnerable: rules.hitInvulnerable }, result: 'hit' };
  }
  const lives = h.lives - 1;
  if (lives <= 0) return { health: { hits: 0, lives: 0, invulnerable: 0 }, result: 'gameOver' };
  return {
    health: { hits: 0, lives, invulnerable: rules.respawnInvulnerable },
    result: 'lifeLost',
  };
}

/** Counts invulnerability down by `dt` seconds. */
export function tickHealth(h: Health, dt: number): Health {
  if (dt < 0) throw new RangeError('dt must not be negative');
  return h.invulnerable > 0 ? { ...h, invulnerable: Math.max(0, h.invulnerable - dt) } : h;
}

/**
 * Whether the ship is drawn this frame: it blinks `flashHz` times a second
 * while invulnerable, and is always visible otherwise.
 */
export function shipVisible(h: Health, flashHz: number): boolean {
  if (h.invulnerable <= 0) return true;
  return Math.floor(h.invulnerable * flashHz * 2) % 2 === 0;
}
