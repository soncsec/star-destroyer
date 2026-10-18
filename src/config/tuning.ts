import type { Cheat } from '../logic/cheats';
import type { DropRules, PowerUpKind } from '../logic/drops';
import type { MovePattern } from '../logic/enemyMoves';
import type { WeaponLevel } from '../logic/weaponLevels';

/** All gameplay numbers live here so they can be tuned in one place. */
export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 320;

/** Drawing order: higher numbers are drawn on top. */
export const DEPTH = {
  background: 0,
  asteroids: 8,
  pickups: 12,
  enemies: 10,
  playerShots: 15,
  enemyShots: 25,
  player: 20,
  explosions: 30,
  hud: 100,
} as const;

/** Power-up drops and pickups (M3.1). */
export const POWERUPS = {
  /** Owner decisions: weapon common, shield uncommon, screen clear rare (never in boss fights). */
  drops: { chance: 0.12, weights: { weapon: 6, shield: 3, clear: 1 } } satisfies DropRules,
  /** Gem sprite for each kind. */
  sprites: { weapon: 'gem-yellow', shield: 'gem-blue', clear: 'gem-pink' } satisfies Record<
    PowerUpKind,
    string
  >,
  /** Pixels per second, downward. */
  fallSpeed: 40,
  /** A little larger than the 12×12 gem, so pickups are easy to grab. */
  hitbox: { w: 14, h: 14 },
  poolSize: 8,
} as const;

/** The shield power-up (M3.3; owner decisions: 30 s, a new pickup resets to 30 s). */
export const SHIELD = {
  duration: 30,
  /** The bubble blinks this many times a second during the last `warnAt` seconds. */
  warnAt: 3,
  blinkHz: 6,
  sprite: 'energy-shield',
  /** The bubble is about 26 px across in the art; 2× (whole-number) puts it around the ship. */
  scale: 2,
  /** Frames 0, 1, 3 loop while it's up (2 is a solid disc that would hide the ship); 4–7 break it. */
  loopFrames: [0, 1, 3],
  breakFrames: [4, 5, 6, 7],
  frameRate: 8,
  /** What touches the bubble: enemy shots are absorbed, rammers destroyed. */
  hitbox: { w: 44, h: 44 },
} as const;

/** Pause, quit and the controls legend (owner request 2026-10-17, PROJECT.md 4b). */
export const CONTROLS = {
  /** The legend shows this long at the start of a game, then hides (H brings it back). */
  introLegendSeconds: 4,
  /** Where Q then Y goes: the arcade portal, one folder up from the game. */
  quitUrl: '../',
  /** The legend, as shown on screen. The hidden cheats are deliberately not listed. */
  legend: [
    ['ARROWS/WASD', 'MOVE'],
    ['SPACE', 'FIRE'],
    ['P / ESC', 'PAUSE'],
    ['Q', 'QUIT'],
    ['H', 'CONTROLS'],
    ['F', 'FULL SCREEN'],
    ['M', 'MUTE'],
  ],
} as const;

/**
 * Hidden cheats (owner request): typed during play, never shown in the game.
 * The words avoid every hotkey letter (checked by tests/unit/cheats.test.ts).
 */
export const CHEATS = {
  words: { lives: 'LIVELONG', invincible: 'IRONBELT' } satisfies Record<Cheat, string>,
  /** Lives the "lives" cheat adds. */
  extraLives: 5,
} as const;

/** Game-over panel (M2.7). */
export const GAME_OVER = {
  /** Seconds from the last hit to the panel appearing (lets the explosion play). */
  showAfter: 1.2,
  /** The "press to play again" prompt blinks this many times a second. */
  blinkHz: 2,
  /** Dark backing behind the panel text. */
  backdrop: { color: 0x05070f, alpha: 0.75 },
  titleColor: '#ff3ea5',
} as const;

/** Score, health pips and lives across the top of the screen (M2.6). */
export const HUD = {
  /** CSS font family; Press Start 2P is drawn at 8 px, its native size. */
  font: '"Press Start 2P"',
  fontSize: 8,
  color: '#ffffff',
  shadow: '#000000',
  /** Margin from the screen edges, pixels. */
  margin: 4,
  pip: { w: 6, h: 4, gap: 2, on: 0x2de2e6, off: 0x2b2160 },
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

/** Shared weapon settings. */
export const WEAPON = {
  /** Seconds between volleys while the fire key is held. */
  fireInterval: 0.2,
  /** Where shots appear, relative to the ship's center (negative = above). */
  muzzleOffsetY: -24,
  /** Most shots on screen at once (level 3 fires three per volley). */
  poolSize: 48,
} as const;

/**
 * Weapon levels 1–3 (owner request: shots start small and grow bigger and
 * stronger). Sprites point right and are turned to face their direction of
 * travel; hitboxes are in screen pixels after that turn (narrower than the glow).
 */
export const WEAPON_LEVELS: readonly (WeaponLevel & {
  sprite: string;
  hitbox: { w: number; h: number };
})[] = [
  // 1: a single small orange tracer (space-marine bullet, visible 10×4).
  {
    sprite: 'shot-tracer',
    damage: 1,
    speed: 340,
    hitbox: { w: 6, h: 12 },
    shots: [{ dx: 0, angleDeg: 0 }],
  },
  // 2: two ringed blue pulses side by side (visible about 50×25 each).
  {
    sprite: 'shot-pulse',
    damage: 1,
    speed: 320,
    hitbox: { w: 12, h: 28 },
    shots: [
      { dx: -7, angleDeg: 0 },
      { dx: 7, angleDeg: 0 },
    ],
  },
  // 3: a spread of three big charged blasts, double damage (visible about 55×30 each).
  {
    sprite: 'shot-charged',
    damage: 2,
    speed: 300,
    hitbox: { w: 18, h: 32 },
    shots: [
      { dx: -6, angleDeg: -12 },
      { dx: 0, angleDeg: 0 },
      { dx: 6, angleDeg: 12 },
    ],
  },
];

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

/** The three enemy types (M2.3). Hitboxes are about 80% of each sprite's visible body. */
export type EnemyKind = 'grunt' | 'weaver' | 'diver';

export interface EnemyType {
  /** Texture key (see the asset manifest). */
  sprite: string;
  /** Hits from the basic weapon needed to destroy it. */
  hp: number;
  points: number;
  /** Whether it shoots (divers ram instead). */
  fires: boolean;
  /** Collision box relative to the sprite centre. */
  hitbox: { w: number; h: number; offsetY: number };
  move: MovePattern;
}

export const ENEMY_TYPES: Readonly<Record<EnemyKind, EnemyType>> = {
  /** enemy-01: flies straight down. Visible body 30×32. */
  grunt: {
    sprite: 'enemy-01',
    hp: 3,
    points: 100,
    fires: true,
    hitbox: { w: 24, h: 28, offsetY: -3 },
    move: { kind: 'straight', speed: 45 },
  },
  /** enemy-02: sways side to side while descending. Visible body 34×28. */
  weaver: {
    sprite: 'enemy-02',
    hp: 2,
    points: 150,
    fires: true,
    hitbox: { w: 28, h: 22, offsetY: -2 },
    move: { kind: 'weave', speed: 35, amplitude: 36, period: 2.4 },
  },
  /** enemy-03: flies in, hovers, then dives at where the ship was. Visible body 42×35. */
  diver: {
    sprite: 'enemy-03',
    hp: 4,
    points: 200,
    fires: false,
    hitbox: { w: 34, h: 28, offsetY: 0 },
    move: { kind: 'dive', enterSpeed: 70, hoverY: 70, hoverTime: 0.9, diveSpeed: 170 },
  },
};

/**
 * Asteroids (M2.5): grey cratered set. Hitboxes are about 80% of the measured
 * visible rock (large 50×46, small about 23×25).
 */
export const ASTEROIDS = {
  large: {
    sprite: 'asteroid-large-1',
    hp: 6,
    points: 50,
    hitbox: { w: 40, h: 36 },
    /** Drift speed down, and the most it can drift sideways, pixels per second. */
    speed: 28,
    maxDrift: 8,
    /** Most spin either way, degrees per second. */
    maxSpin: 40,
  },
  small: {
    /** One of these, picked with the seeded RNG. */
    sprites: ['asteroid-large-2', 'asteroid-large-3', 'asteroid-large-5'],
    hp: 1,
    points: 25,
    hitbox: { w: 18, h: 18 },
  },
  split: { pieces: 3, speed: 55, fanDeg: 120, jitterDeg: 12, maxSpin: 200 },
  poolLarge: 6,
  poolSmall: 24,
} as const;

/** Anything a wave script can spawn. */
export type SpawnKind = EnemyKind | 'asteroid';

/** Shared by every enemy type. */
export const ENEMY_COMMON = {
  /** How long an enemy flashes after being hit, in seconds. */
  hitFlash: 0.08,
  poolSize: 16,
} as const;

export const EXPLOSION = {
  sprite: 'enemy-explosion',
  poolSize: 8,
} as const;

/** Seed for gameplay randomness, so a run can be replayed. Override with ?seed=123 in the URL. */
export const DEFAULT_SEED = 20261017;
