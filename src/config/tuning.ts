import type { BossRules } from '../logic/boss';
import type { Cheat } from '../logic/cheats';
import type { DropRules, PowerUpKind } from '../logic/drops';
import type { FinalBossRules, FinalPart } from '../logic/finalBoss';
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
  /** The screen clear's blast stays behind the ship, so the player never loses sight of it. */
  blast: 18,
  player: 20,
  /** Hit sparks sit over ships and shots, under explosions. */
  sparks: 28,
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

/** The shield power-up (M3.3; owner decisions: 10 s since 2026-10-18 (was 30), a new pickup resets it). */
export const SHIELD = {
  duration: 10,
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

/** Level flow (M4.4): boss after the waves, then the level-complete panel. */
export const LEVEL_COMPLETE = {
  /** Seconds from the boss's defeat to the panel (lets the blast play). */
  completeAfter: 2,
  /** Seconds the panel stays before the next level starts by itself. */
  autoNext: 8,
  /** The "press Space" prompt blinks this many times a second. */
  blinkHz: 2,
  backdrop: { color: 0x05070f, alpha: 0.75 },
  titleColor: '#2de2e6',
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
  /** The boss's health bar, centered under the score and lives (M4.3). */
  bossBar: { w: 120, h: 4, y: 28, fill: 0xff4d6d, back: 0x2b2160 },
  /** Seconds a boss flashes after a hit. */
  bossHitFlash: 0.06,
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
  /** Seconds between volleys while the fire key is held. */
  fireInterval: number;
  /**
   * Drawn at this scale. Owner 2026-10-18: the larger shots are drawn at 45%
   * (not a whole number: an owner-approved exception to whole-pixel scaling);
   * the small level-1 tracer stays full size so it can be seen. Hitboxes match.
   */
  scale: number;
})[] = [
  // Owner requests 2026-10-18 (the game was too easy): stronger levels fire a
  // little less often and their shots fly a little slower (level 2: 5% below
  // level 1, level 3: 10%), and then every level 15% slower again on both.
  // Hitboxes match the shots' drawn size.
  // 1: a single small orange tracer (space-marine bullet, visible 10×4).
  {
    sprite: 'shot-tracer',
    damage: 1,
    speed: 289,
    fireInterval: 0.2 / 0.85,
    scale: 1,
    // Exactly the tracer's visible size (10×4, turned to point up), so each
    // level still hits a bigger area than the last.
    hitbox: { w: 4, h: 10 },
    shots: [{ dx: 0, angleDeg: 0 }],
  },
  // 2: two ringed blue pulses side by side (visible about 50×25 each).
  {
    sprite: 'shot-pulse',
    damage: 1,
    speed: 258,
    fireInterval: 0.2 / (0.95 * 0.85),
    scale: 0.45,
    hitbox: { w: 5, h: 13 },
    shots: [
      { dx: -7, angleDeg: 0 },
      { dx: 7, angleDeg: 0 },
    ],
  },
  // 3: a spread of three big charged blasts, double damage (visible about 55×30 each).
  {
    sprite: 'shot-charged',
    damage: 2,
    speed: 230,
    fireInterval: 0.2 / (0.9 * 0.85),
    scale: 0.45,
    hitbox: { w: 8, h: 14 },
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
export type EnemyKind = 'grunt' | 'weaver' | 'diver' | 'flyer' | 'eye' | 'skull';

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
  /**
   * Alien flyer (levels 3 and 4, M5.3): a winged bug, bigger and tougher, that
   * sways wide and slow while it shoots. Frame 83×64; the hitbox covers the
   * body, not the wingtips.
   */
  flyer: {
    sprite: 'enemy-alien-flyer',
    hp: 5,
    points: 250,
    fires: true,
    hitbox: { w: 40, h: 34, offsetY: 4 },
    move: { kind: 'weave', speed: 30, amplitude: 48, period: 3.2 },
  },
  /**
   * Flying-eye demon (level 6 and later, M6.3): small, quick and frail, with a
   * fast, tight sway while it shoots. Frame 48×48, body about 24×27.
   */
  eye: {
    sprite: 'enemy-flying-eye',
    hp: 2,
    points: 175,
    fires: true,
    hitbox: { w: 20, h: 20, offsetY: 0 },
    move: { kind: 'weave', speed: 48, amplitude: 28, period: 1.6 },
  },
  /**
   * Fire skull (level 6 and later, M6.3): hovers, then rams like a diver, but
   * tougher and faster. Frame 54×70; the hitbox covers the skull, not the
   * wisps above it.
   */
  skull: {
    sprite: 'enemy-fire-skull',
    hp: 5,
    points: 225,
    fires: false,
    hitbox: { w: 30, h: 36, offsetY: 6 },
    move: { kind: 'dive', enterSpeed: 60, hoverY: 60, hoverTime: 0.7, diveSpeed: 190 },
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

/** A defeated boss: explosions at these offsets from its center, under the big blast. */
export const BOSS_DEFEAT = {
  bursts: [
    [0, 0],
    [-22, -26],
    [24, -12],
    [-18, 22],
    [20, 30],
  ] as const,
};

/** Bosses, by the art they use (PROJECT.md 4a level plan). More arrive with each level. */
export type BossKind =
  | 'spaceship-unit'
  | 'vehicle-1'
  | 'vehicle-2'
  | 'spaceship-unit-mk2'
  | 'vehicle-3'
  | 'fire-skull'
  | 'twin-vehicle-1';

/**
 * Bosses (M4.3). Each fights in phases: as its health falls it switches to
 * harder attacks and sways faster. Fans are checked by unit tests to leave a
 * gap the ship fits through at its starting height (PROJECT.md 4a).
 */
export const BOSSES: Record<
  BossKind,
  BossRules & {
    sprite: string;
    /** The side-view art faces right; this turns it to face down. */
    angleDeg: number;
    /**
     * Collision box after turning (a little inside the hull). offsetY moves it
     * down from the sprite's centre, for a boss too long to show whole.
     */
    hitbox: { w: number; h: number; offsetY: number };
  }
> = {
  // Level 1: the Warped spaceship unit, 106×77, turned to face down (77 wide, 106 tall).
  'spaceship-unit': {
    sprite: 'boss-spaceship-unit',
    angleDeg: 90,
    hitbox: { w: 60, h: 84, offsetY: 0 },
    hp: 150,
    points: 5000,
    entry: { startY: -60, hoverY: 70, speed: 40 },
    swayAmplitude: 70,
    muzzleOffsetY: 44,
    shotSpeed: 120,
    maxAimAngleDeg: 30,
    phases: [
      {
        fromHp: 1,
        attacks: [{ kind: 'aimed' }, { kind: 'fan', shots: 3, spreadDeg: 50 }],
        cooldown: 1.4,
        swayHz: 0.12,
      },
      {
        fromHp: 0.6,
        attacks: [{ kind: 'fan', shots: 5, spreadDeg: 70 }, { kind: 'aimed' }, { kind: 'aimed' }],
        cooldown: 1.1,
        swayHz: 0.18,
      },
      {
        fromHp: 0.3,
        attacks: [
          { kind: 'fan', shots: 5, spreadDeg: 80 },
          { kind: 'fan', shots: 4, spreadDeg: 60 },
          { kind: 'aimed' },
        ],
        cooldown: 0.9,
        swayHz: 0.24,
      },
    ],
  },
  // Level 2: Warped vehicle 1, 176×96, turned to face down (96 wide, 176 tall).
  // Tougher than level 1's: more health, wider fans, faster phases.
  'vehicle-1': {
    sprite: 'boss-vehicle-1',
    angleDeg: 90,
    hitbox: { w: 64, h: 150, offsetY: 0 },
    hp: 220,
    points: 7500,
    entry: { startY: -90, hoverY: 80, speed: 40 },
    swayAmplitude: 60,
    muzzleOffsetY: 80,
    shotSpeed: 125,
    maxAimAngleDeg: 30,
    phases: [
      {
        fromHp: 1,
        attacks: [{ kind: 'fan', shots: 4, spreadDeg: 60 }, { kind: 'aimed' }, { kind: 'aimed' }],
        cooldown: 1.3,
        swayHz: 0.1,
      },
      {
        fromHp: 0.6,
        attacks: [
          { kind: 'fan', shots: 5, spreadDeg: 80 },
          { kind: 'fan', shots: 3, spreadDeg: 40 },
          { kind: 'aimed' },
        ],
        cooldown: 1.05,
        swayHz: 0.15,
      },
      {
        fromHp: 0.3,
        attacks: [
          { kind: 'fan', shots: 6, spreadDeg: 90 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 5, spreadDeg: 70 },
          { kind: 'aimed' },
        ],
        cooldown: 0.85,
        swayHz: 0.2,
      },
    ],
  },
  // Level 3: Warped vehicle 2, 176×125, turned to face down (125 wide, 176 tall).
  // Tougher again: more health, fans up to 7 shots, a faster tempo.
  'vehicle-2': {
    sprite: 'boss-vehicle-2',
    angleDeg: 90,
    hitbox: { w: 84, h: 150, offsetY: 0 },
    hp: 280,
    points: 10000,
    entry: { startY: -90, hoverY: 80, speed: 40 },
    swayAmplitude: 50,
    muzzleOffsetY: 82,
    shotSpeed: 130,
    maxAimAngleDeg: 30,
    phases: [
      {
        fromHp: 1,
        attacks: [
          { kind: 'fan', shots: 5, spreadDeg: 70 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 4, spreadDeg: 50 },
        ],
        cooldown: 1.2,
        swayHz: 0.1,
      },
      {
        fromHp: 0.6,
        attacks: [
          { kind: 'fan', shots: 6, spreadDeg: 90 },
          { kind: 'aimed' },
          { kind: 'aimed' },
          { kind: 'fan', shots: 5, spreadDeg: 60 },
        ],
        cooldown: 0.95,
        swayHz: 0.14,
      },
      {
        fromHp: 0.3,
        attacks: [
          { kind: 'fan', shots: 7, spreadDeg: 100 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 6, spreadDeg: 80 },
          { kind: 'aimed' },
        ],
        cooldown: 0.8,
        swayHz: 0.18,
      },
    ],
  },
  // Level 4: the spaceship unit again, upgraded (PROJECT.md 4a: "upgraded
  // attacks"): more health, a fourth phase, wider fans, faster sway.
  'spaceship-unit-mk2': {
    sprite: 'boss-spaceship-unit',
    angleDeg: 90,
    hitbox: { w: 60, h: 84, offsetY: 0 },
    hp: 340,
    points: 12500,
    entry: { startY: -60, hoverY: 70, speed: 45 },
    swayAmplitude: 85,
    muzzleOffsetY: 44,
    shotSpeed: 135,
    maxAimAngleDeg: 30,
    phases: [
      {
        fromHp: 1,
        attacks: [{ kind: 'fan', shots: 5, spreadDeg: 70 }, { kind: 'aimed' }, { kind: 'aimed' }],
        cooldown: 1.1,
        swayHz: 0.15,
      },
      {
        fromHp: 0.7,
        attacks: [
          { kind: 'fan', shots: 6, spreadDeg: 90 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 4, spreadDeg: 50 },
        ],
        cooldown: 0.95,
        swayHz: 0.2,
      },
      {
        fromHp: 0.4,
        attacks: [
          { kind: 'fan', shots: 7, spreadDeg: 100 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 5, spreadDeg: 60 },
          { kind: 'aimed' },
        ],
        cooldown: 0.8,
        swayHz: 0.26,
      },
      {
        fromHp: 0.15,
        attacks: [
          { kind: 'fan', shots: 7, spreadDeg: 110 },
          { kind: 'fan', shots: 6, spreadDeg: 90 },
          { kind: 'aimed' },
          { kind: 'aimed' },
        ],
        cooldown: 0.7,
        swayHz: 0.32,
      },
    ],
  },
  // Level 5: Warped vehicle 3, 329×160, turned to face down (160 wide, 329
  // tall: longer than the screen). It hangs down from the top with only its
  // front half showing, so its hitbox covers just that half. Its nose is close
  // to the ship, so it fires a little slower, in wide fans with few shots.
  'vehicle-3': {
    sprite: 'boss-vehicle-3',
    angleDeg: 90,
    hitbox: { w: 100, h: 140, offsetY: 94 },
    hp: 400,
    points: 15000,
    entry: { startY: -170, hoverY: -14, speed: 40 },
    swayAmplitude: 48,
    muzzleOffsetY: 160,
    shotSpeed: 115,
    maxAimAngleDeg: 35,
    phases: [
      {
        fromHp: 1,
        attacks: [{ kind: 'fan', shots: 4, spreadDeg: 75 }, { kind: 'aimed' }, { kind: 'aimed' }],
        cooldown: 1.2,
        swayHz: 0.08,
      },
      {
        fromHp: 0.6,
        attacks: [
          { kind: 'fan', shots: 5, spreadDeg: 90 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 4, spreadDeg: 60 },
          { kind: 'aimed' },
        ],
        cooldown: 1,
        swayHz: 0.11,
      },
      {
        fromHp: 0.3,
        attacks: [
          { kind: 'fan', shots: 6, spreadDeg: 100 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 5, spreadDeg: 80 },
          { kind: 'aimed' },
          { kind: 'aimed' },
        ],
        cooldown: 0.85,
        swayHz: 0.14,
      },
    ],
  },
  // Level 6: the fire skull in flames, 96×112, front on (no turn). PROJECT.md
  // 4a gives it an "enlarged role": smaller than the ships, so it sways wide
  // and fast across the screen, through four phases.
  'fire-skull': {
    sprite: 'boss-fire-skull',
    angleDeg: 0,
    hitbox: { w: 60, h: 70, offsetY: 10 },
    hp: 470,
    points: 17500,
    entry: { startY: -70, hoverY: 80, speed: 50 },
    swayAmplitude: 90,
    muzzleOffsetY: 40,
    shotSpeed: 140,
    maxAimAngleDeg: 35,
    phases: [
      {
        fromHp: 1,
        attacks: [{ kind: 'fan', shots: 5, spreadDeg: 70 }, { kind: 'aimed' }, { kind: 'aimed' }],
        cooldown: 1.05,
        swayHz: 0.2,
      },
      {
        fromHp: 0.7,
        attacks: [
          { kind: 'fan', shots: 6, spreadDeg: 90 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 5, spreadDeg: 60 },
        ],
        cooldown: 0.9,
        swayHz: 0.26,
      },
      {
        fromHp: 0.4,
        attacks: [
          { kind: 'fan', shots: 7, spreadDeg: 100 },
          { kind: 'aimed' },
          { kind: 'aimed' },
          { kind: 'fan', shots: 6, spreadDeg: 80 },
        ],
        cooldown: 0.78,
        swayHz: 0.32,
      },
      {
        fromHp: 0.15,
        attacks: [
          { kind: 'fan', shots: 7, spreadDeg: 110 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 7, spreadDeg: 100 },
          { kind: 'aimed' },
        ],
        cooldown: 0.68,
        swayHz: 0.38,
      },
    ],
  },
  // Level 7: twin Warped vehicle 1s (level 2's boss), one either side, each
  // with its own health. They sway as mirror images, and one waits at least
  // half a cooldown after the other attacks (logic/boss.ts), so each attacks
  // about half as often as a single boss would. Together: 560 HP.
  'twin-vehicle-1': {
    sprite: 'boss-vehicle-1',
    angleDeg: 90,
    hitbox: { w: 64, h: 150, offsetY: 0 },
    twin: { offsetX: 64 },
    hp: 280,
    points: 10000,
    entry: { startY: -90, hoverY: 80, speed: 40 },
    swayAmplitude: 30,
    muzzleOffsetY: 80,
    shotSpeed: 140,
    maxAimAngleDeg: 30,
    phases: [
      {
        fromHp: 1,
        attacks: [{ kind: 'fan', shots: 4, spreadDeg: 60 }, { kind: 'aimed' }, { kind: 'aimed' }],
        cooldown: 1.6,
        swayHz: 0.12,
      },
      {
        fromHp: 0.6,
        attacks: [
          { kind: 'fan', shots: 5, spreadDeg: 80 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 3, spreadDeg: 40 },
          { kind: 'aimed' },
        ],
        cooldown: 1.35,
        swayHz: 0.16,
      },
      {
        fromHp: 0.3,
        attacks: [
          { kind: 'fan', shots: 6, spreadDeg: 90 },
          { kind: 'aimed' },
          { kind: 'fan', shots: 5, spreadDeg: 70 },
          { kind: 'aimed' },
        ],
        cooldown: 1.1,
        swayHz: 0.2,
      },
    ],
  },
};

/** The final boss's kind (level 8, M6.5): its own rules, not a `BOSSES` entry. */
export type FinalBossKind = 'final-boss';

/** Any boss a level can end with. */
export type LevelBossKind = BossKind | FinalBossKind;

/**
 * The final boss (M6.5): the Warped top-down boss, 192×144, already facing
 * down. Fought in stages: its two cannons, then its helmet, then its exposed
 * core, which adds a beam that always charges first (logic/finalBoss.ts).
 * Part offsets were measured against the art: the cannon and helmet images
 * match the whole-boss frame exactly at these positions, so they are drawn
 * over the bare body (frame 2).
 */
export const FINAL_BOSS: FinalBossRules & {
  body: string;
  /** Body frame for each look: all parts on (bare body + part images), core cracked, wrecked. */
  bodyFrames: { bare: number; cracked: number; wrecked: number };
  /** The core shows the cracked frame below this fraction of its health. */
  crackedBelow: number;
  thrust: string;
  /** Thrust flames, mostly behind the top of the body (the boss flies down the screen). */
  thrustOffsetY: number;
  partSprites: Readonly<Record<Exclude<FinalPart, 'core'>, string>>;
  rays: string;
  /** Rays frames: charging (the warning) and the beam itself. */
  rayFrames: { warn: readonly number[]; fire: readonly number[] };
  /** The beam art starts this far down its 224-tall frame. */
  rayTop: number;
} = {
  body: 'boss',
  bodyFrames: { bare: 2, cracked: 3, wrecked: 4 },
  crackedBelow: 0.5,
  thrust: 'boss-thrust',
  thrustOffsetY: -48,
  partSprites: {
    cannonLeft: 'boss-cannon-left',
    cannonRight: 'boss-cannon-right',
    helmet: 'boss-helmet',
  },
  rays: 'boss-rays',
  rayFrames: { warn: [0, 1, 2, 3, 4, 5, 6, 7], fire: [8, 9, 10] },
  rayTop: 30,
  entry: { startY: -80, hoverY: 72, speed: 35 },
  swayAmplitude: 30,
  shotSpeed: 140,
  maxAimAngleDeg: 35,
  parts: {
    cannonLeft: {
      hp: 140,
      points: 5000,
      offset: { x: -56, y: 32 },
      hitbox: { w: 30, h: 36 },
      muzzleY: 54,
    },
    cannonRight: {
      hp: 140,
      points: 5000,
      offset: { x: 56, y: 32 },
      hitbox: { w: 30, h: 36 },
      muzzleY: 54,
    },
    helmet: {
      hp: 220,
      points: 10000,
      offset: { x: 0, y: 4 },
      hitbox: { w: 50, h: 46 },
      muzzleY: 32,
    },
    core: { hp: 320, points: 25000, offset: { x: 0, y: 8 }, hitbox: { w: 28, h: 34 }, muzzleY: 30 },
  },
  hull: { w: 150, h: 90, offsetY: 0 },
  stages: {
    // The cannons take turns, so each fires every other attack.
    cannons: {
      attacks: [
        { kind: 'fan', shots: 3, spreadDeg: 40 },
        { kind: 'aimed' },
        { kind: 'fan', shots: 3, spreadDeg: 40 },
        { kind: 'aimed' },
      ],
      cooldown: 0.75,
      swayHz: 0.12,
    },
    helmet: {
      attacks: [
        { kind: 'fan', shots: 7, spreadDeg: 100 },
        { kind: 'aimed' },
        { kind: 'fan', shots: 5, spreadDeg: 60 },
        { kind: 'aimed' },
        { kind: 'aimed' },
      ],
      cooldown: 0.8,
      swayHz: 0.18,
    },
    core: {
      attacks: [{ kind: 'aimed' }, { kind: 'aimed' }, { kind: 'fan', shots: 6, spreadDeg: 90 }],
      cooldown: 0.7,
      swayHz: 0.22,
    },
  },
  beam: { every: 4, warn: 1.2, fire: 1.4, width: 16 },
};

/** Shared by every enemy type. */
export const ENEMY_COMMON = {
  /** How long an enemy flashes after being hit, in seconds. */
  hitFlash: 0.08,
  poolSize: 16,
} as const;

export const EXPLOSION = {
  sprite: 'enemy-explosion',
  /** Enough for a screen clear to blow up a full pool of enemies at once. */
  poolSize: 16,
} as const;

/**
 * Difficulty curve (M4.2): how the level-1 numbers above grow towards level 8.
 * PROJECT.md 4a limits: fire rate at most 2.5× by level 8 (about +14% per
 * level), shot speed at most +30%, shield and weapon drops slightly more common.
 */
export const DIFFICULTY = {
  lastLevel: 8,
  fireRateAtLast: 2.5,
  shotSpeedAtLast: 1.3,
  helpfulDropsAtLast: 1.25,
} as const;

/** Hit sparks (M3.5): a short flash wherever a shot hits something. */
export const HIT_SPARK = {
  sprite: 'hit-spark',
  /** Room for a level-3 spread hitting several targets while others still fade. */
  poolSize: 24,
} as const;

/** Screen-clear power-up (M3.4): every enemy on screen and every enemy shot is destroyed. */
export const SCREEN_CLEAR = {
  /** The big blast centered on the ship: 192×192, 22 frames. */
  blast: 'explosion-e',
  /** A short white flash of the whole screen, in milliseconds. */
  flashMs: 200,
} as const;

/** Seed for gameplay randomness, so a run can be replayed. Override with ?seed=123 in the URL. */
export const DEFAULT_SEED = 20261017;
