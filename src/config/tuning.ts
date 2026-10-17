/** All gameplay numbers live here so they can be tuned in one place. */
export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 320;

/** Drawing order: higher numbers are drawn on top. */
export const DEPTH = {
  background: 0,
  enemies: 10,
  playerShots: 15,
  enemyShots: 25,
  player: 20,
  explosions: 30,
} as const;

/** Background scroll speeds in pixels per second. The star layer moves faster for depth. */
export const BACKGROUND = {
  nebulaSpeed: 10,
  starsSpeed: 28,
} as const;

export const PLAYER = {
  /** Texture key of the player's ship (see the asset manifest). */
  ship: 'ship-01-red',
  thrust: 'thrust-ship-01',
  /**
   * Sheet frames for [hard left, slight left, level, slight right, hard right].
   * Each ship's sheet is ordered differently; this layout is ship-01's, checked by eye
   * at 8× zoom (frame 0 is the level pose; 1–2 lean left, 3–4 lean right).
   */
  bankFrames: [2, 1, 0, 3, 4],
  /** How many pixels the engine flame overlaps the bottom of the ship sprite. */
  thrustOverlap: 5,
  /** Pixels per second; diagonal movement is the same speed, not faster. */
  speed: 120,
  /** How fast the ship tilts toward the steering direction, in full tilts per second. */
  bankRate: 6,
  /** Space kept between the ship's sprite edge and the screen edge, in pixels. */
  edgeMargin: 2,
  /** Where the ship starts, as a fraction of the screen height from the top. */
  startY: 0.85,
} as const;

export const WEAPON = {
  /** Effect sprite for the basic shot. The art points right, so it's rotated to fire upward. */
  sprite: 'shot-bolt',
  /** Seconds between shots while the fire key is held. */
  fireInterval: 0.2,
  /** Pixels per second, upward. */
  bulletSpeed: 320,
  /** Where shots appear, relative to the ship's center (negative = above). */
  muzzleOffsetY: -24,
  /** Collision box in screen pixels after rotation (narrower than the art's glow). */
  hitbox: { w: 10, h: 26 },
  /** Most shots on screen at once; extra shots wait for a free slot. */
  poolSize: 16,
} as const;

/** The basic enemy (M1.7). More types and wave scripts arrive in M2. */
/** Health and lives (owner decisions: 5 hits per life, 3 lives). */
export const PLAYER_HEALTH = {
  hitsPerLife: 5,
  lives: 3,
  /** Seconds of invulnerability after a hit, so one collision counts once. */
  hitInvulnerable: 0.6,
  /** Seconds of invulnerability (flashing) after losing a life and respawning. */
  respawnInvulnerable: 2,
  /** Blinks per second while invulnerable. */
  flashHz: 10,
  /** Collision box: smaller than the 48×48 ship so near misses feel fair. */
  hitbox: { w: 16, h: 20 },
} as const;

/**
 * Enemy shots, level 1 values. Later levels scale fire rate up to 2.5× and
 * shot speed up to 1.3× (PROJECT.md 4a, M4.2).
 */
export const ENEMY_FIRE = {
  sprite: 'boss-bolt',
  /** Average seconds between one enemy's shots, and the random spread around it. */
  interval: 2.2,
  jitter: 0.5,
  /** An enemy's first shot comes at least this long after it appears. */
  firstShotMin: 0.6,
  /** Pixels per second. */
  speed: 110,
  /** Shots aim at the ship but turn at most this far from straight down. */
  maxAimAngleDeg: 30,
  /** Shots leave from just below the enemy's centre. */
  muzzleOffsetY: 14,
  /** Collision box: a little smaller than the 8×8 bolt. */
  hitbox: { w: 6, h: 6 },
  poolSize: 48,
} as const;

export const ENEMY_BASIC = {
  sprite: 'enemy-01',
  /** Hits from the basic weapon needed to destroy it. */
  hp: 3,
  /** Pixels per second, downward. */
  speed: 45,
  /** Seconds between spawns. */
  spawnInterval: 1.4,
  /** Collision box: the visible body, slightly smaller than the 48×48 frame. */
  hitbox: { w: 24, h: 28, offsetY: -3 },
  /** How long the enemy flashes after being hit, in seconds. */
  hitFlash: 0.08,
  poolSize: 12,
  points: 100,
} as const;

export const EXPLOSION = {
  sprite: 'enemy-explosion',
  poolSize: 8,
} as const;

/** Seed for gameplay randomness, so a run can be replayed. Override with ?seed=123 in the URL. */
export const DEFAULT_SEED = 20261017;
