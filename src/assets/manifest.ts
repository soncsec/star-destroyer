/**
 * Every image the game loads, with its frame layout.
 * Frame sizes come from the individual frame files shipped in the art pack (see CREDITS.md).
 * tests/unit/manifest.test.ts checks these numbers against the real PNG files.
 */
export type AssetGroup =
  | 'player'
  | 'enemies'
  | 'boss'
  | 'asteroids'
  | 'backgrounds'
  | 'weapons'
  | 'explosions'
  | 'pickups'
  | 'effects';

export interface SheetAsset {
  kind: 'sheet';
  key: string;
  group: AssetGroup;
  /** Path under public/, e.g. assets/player/ship-01-red.png */
  path: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  /** Default animation speed in frames per second. */
  frameRate: number;
  /** Whether the default animation loops. */
  loop: boolean;
  /** Frames the default animation leaves out (see `animFrames`). */
  skipFrames?: readonly number[];
}

export interface ImageAsset {
  kind: 'image';
  key: string;
  group: AssetGroup;
  path: string;
  width: number;
  height: number;
}

export type Asset = SheetAsset | ImageAsset;

const sheet = (
  group: AssetGroup,
  key: string,
  file: string,
  frameWidth: number,
  frameHeight: number,
  frames: number,
  frameRate: number,
  loop: boolean,
): SheetAsset => ({
  kind: 'sheet',
  key,
  group,
  path: `assets/${group}/${file}`,
  frameWidth,
  frameHeight,
  frames,
  frameRate,
  loop,
});

const image = (
  group: AssetGroup,
  key: string,
  file: string,
  width: number,
  height: number,
): ImageAsset => ({ kind: 'image', key, group, path: `assets/${group}/${file}`, width, height });

const ships = (['01', '02', '03', '04'] as const).flatMap((n) => {
  const size = n === '02' ? 64 : 48;
  // Banking frames: 0 = hard left, 2 = level, 4 = hard right. Not an animation loop.
  return (['red', 'yellow'] as const).map((color) =>
    sheet('player', `ship-${n}-${color}`, `ship-${n}-${color}.png`, size, size, 5, 0, false),
  );
});

export const ASSETS: readonly Asset[] = [
  ...ships,
  sheet('player', 'thrust-ship-01', 'thrust-ship-01.png', 16, 10, 2, 12, true),
  sheet('player', 'thrust-ship-03', 'thrust-ship-03.png', 20, 16, 2, 12, true),
  sheet('player', 'thrust-ship-04', 'thrust-ship-04.png', 11, 12, 2, 12, true),

  sheet('enemies', 'enemy-01', 'enemy-01.png', 48, 48, 5, 10, true),
  sheet('enemies', 'enemy-02', 'enemy-02.png', 48, 48, 4, 10, true),
  sheet('enemies', 'enemy-03', 'enemy-03.png', 48, 48, 4, 10, true),
  // Alien flyer (M5.1, levels 3 and 4): a winged bug, wings beating.
  sheet('enemies', 'enemy-alien-flyer', 'alien-flyer.png', 83, 64, 8, 12, true),
  // Level 6, Demon Rift (M6.1): Gothicvania's flying-eye demon and fire skull (without its flames), side view.
  sheet('enemies', 'enemy-flying-eye', 'flying-eye.png', 48, 48, 8, 12, true),
  sheet('enemies', 'enemy-fire-skull', 'fire-skull.png', 54, 70, 4, 8, true),
  sheet('enemies', 'enemy-explosion', 'enemy-explosion.png', 80, 80, 7, 14, false),

  sheet('boss', 'boss', 'boss.png', 192, 144, 5, 8, true),
  sheet('boss', 'boss-thrust', 'boss-thrust.png', 128, 48, 2, 12, true),
  image('boss', 'boss-cannon-left', 'cannon-left.png', 48, 48),
  image('boss', 'boss-cannon-right', 'cannon-right.png', 48, 48),
  image('boss', 'boss-helmet', 'helmet.png', 64, 56),
  sheet('boss', 'boss-rays', 'rays.png', 64, 224, 11, 14, false),
  sheet('boss', 'boss-bolt', 'bolt.png', 8, 8, 2, 12, true),
  // Level 1 boss (M4.3): the Warped spaceship unit with its thrust, side view facing right.
  sheet('boss', 'boss-spaceship-unit', 'spaceship-unit.png', 106, 77, 8, 10, true),
  // Level 2 and 3 bosses (M5.1): Warped vehicles 1 and 2, side view facing right, thrust animating.
  sheet('boss', 'boss-vehicle-1', 'vehicle-1.png', 176, 96, 3, 10, true),
  sheet('boss', 'boss-vehicle-2', 'vehicle-2.png', 176, 125, 3, 10, true),
  // Level 5 boss (M6.1): Warped vehicle 3, side view facing right, too long to fit on screen whole.
  sheet('boss', 'boss-vehicle-3', 'vehicle-3.png', 329, 160, 3, 10, true),
  // Level 6 boss (M6.1): the fire skull in flames.
  sheet('boss', 'boss-fire-skull', 'fire-skull.png', 96, 112, 8, 10, true),

  image('asteroids', 'asteroid-small-1', 'small-1.png', 17, 16),
  image('asteroids', 'asteroid-small-2', 'small-2.png', 11, 14),
  image('asteroids', 'asteroid-small-3', 'small-3.png', 45, 29),
  image('asteroids', 'asteroid-small-4', 'small-4.png', 30, 31),
  image('asteroids', 'asteroid-small-5', 'small-5.png', 36, 35),
  image('asteroids', 'asteroid-large-1', 'large-01.png', 67, 63),
  image('asteroids', 'asteroid-large-2', 'large-02.png', 49, 40),
  image('asteroids', 'asteroid-large-3', 'large-03.png', 46, 40),
  image('asteroids', 'asteroid-large-4', 'large-04.png', 32, 40),
  image('asteroids', 'asteroid-large-5', 'large-05.png', 42, 40),

  image('backgrounds', 'bg-stage-back', 'stage-back.png', 256, 320),
  image('backgrounds', 'bg-stage-props', 'stage-props.png', 256, 151),
  image('backgrounds', 'bg-planet', 'planet.png', 63, 61),
  image('backgrounds', 'bg-eclipse-1', 'eclipse-1.png', 63, 61),
  image('backgrounds', 'bg-eclipse-2', 'eclipse-2.png', 63, 61),
  image('backgrounds', 'bg-planet-large', 'planet-large.png', 120, 120),
  image('backgrounds', 'bg-blue-back', 'blue-back.png', 272, 160),
  image('backgrounds', 'bg-blue-stars', 'blue-stars.png', 272, 160),
  image('backgrounds', 'bg-blue-with-stars', 'blue-with-stars.png', 272, 160),
  image('backgrounds', 'bg-prop-planet-big', 'prop-planet-big.png', 43, 43),
  image('backgrounds', 'bg-prop-planet-small', 'prop-planet-small.png', 16, 16),
  // Level 2, Asteroid Belt (M5.1): the asteroid-fighter pack's purple field.
  image('backgrounds', 'bg-asteroid-field', 'asteroid-field.png', 160, 288),
  // Level 4, Red Giant (M5.1): the space background pack's original red parallax layers.
  image('backgrounds', 'bg-red-back', 'red-back.png', 272, 160),
  image('backgrounds', 'bg-red-stars', 'red-stars.png', 272, 160),
  image('backgrounds', 'bg-red-far-planets', 'red-far-planets.png', 272, 160),
  image('backgrounds', 'bg-red-big-planet', 'red-big-planet.png', 88, 87),
  image('backgrounds', 'bg-red-ring-planet', 'red-ring-planet.png', 51, 115),
  // Level 5, Station Run (M6.1): the Warped Zone 202 corridor turned upright (tools/art/build_tunnel.py).
  image('backgrounds', 'bg-station-tunnel', 'station-tunnel.png', 256, 288),

  sheet('weapons', 'shot-tracer', 'tracer.png', 10, 4, 2, 14, true),
  sheet('weapons', 'shot-bolt', 'bolt.png', 48, 32, 4, 14, true),
  sheet('weapons', 'shot-charged', 'charged.png', 63, 48, 6, 14, true),
  sheet('weapons', 'shot-crossed', 'crossed.png', 32, 32, 6, 14, true),
  sheet('weapons', 'shot-pulse', 'pulse.png', 63, 32, 4, 14, true),
  sheet('weapons', 'shot-spark', 'spark.png', 63, 32, 5, 14, true),
  sheet('weapons', 'shot-waveform', 'waveform.png', 95, 32, 4, 14, true),

  // Power-up pickups (M3): spinning gems, 7 frames of 12×12 each.
  sheet('pickups', 'gem-yellow', 'gem-yellow.png', 12, 12, 7, 10, true),
  sheet('pickups', 'gem-blue', 'gem-blue.png', 12, 12, 7, 10, true),
  sheet('pickups', 'gem-pink', 'gem-pink.png', 12, 12, 7, 10, true),
  // Shield bubble (M3.3): frames 0-3 form it, 4-7 break it.
  sheet('effects', 'energy-shield', 'energy-shield.png', 51, 47, 8, 12, false),
  // Hit spark (M3.5): a cyan starburst that breaks into sparkles.
  sheet('effects', 'hit-spark', 'hit-spark.png', 32, 32, 5, 20, false),

  sheet('explosions', 'explosion-a', 'explosion-a.png', 32, 32, 8, 16, false),
  sheet('explosions', 'explosion-b', 'explosion-b.png', 64, 64, 8, 16, false),
  sheet('explosions', 'explosion-c', 'explosion-c.png', 128, 80, 10, 16, false),
  sheet('explosions', 'explosion-d', 'explosion-d.png', 128, 128, 12, 16, false),
  // The big blast (screen clear, boss defeat). Frames 14-18 of the art are a
  // flash that fills the whole 192x192 frame; on our 256-wide screen it shows as
  // an orange square (owner report 2026-10-18), so the animation skips them. The
  // screen clear's camera flash stands in for it.
  {
    ...sheet('explosions', 'explosion-e', 'explosion-e.png', 192, 192, 22, 20, false),
    skipFrames: [14, 15, 16, 17, 18],
  },
  sheet('explosions', 'explosion-f', 'explosion-f.png', 48, 48, 8, 16, false),
  sheet('explosions', 'explosion-g', 'explosion-g.png', 48, 48, 7, 16, false),
];

/** The frames a sheet's default animation plays, in order: all of them except `skipFrames`. */
export const animFrames = (asset: SheetAsset): number[] =>
  Array.from({ length: asset.frames }, (_, i) => i).filter((i) => !asset.skipFrames?.includes(i));

/** Animation key for a sheet's default animation. */
export const animKey = (key: string): string => `${key}:play`;
