/** All gameplay numbers live here so they can be tuned in one place. */
export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 320;

/** Drawing order: higher numbers are drawn on top. */
export const DEPTH = {
  background: 0,
  player: 20,
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
