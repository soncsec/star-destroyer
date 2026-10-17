/** All gameplay numbers live here so they can be tuned in one place. */
export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 320;

/** Background scroll speeds in pixels per second. The star layer moves faster for depth. */
export const BACKGROUND = {
  nebulaSpeed: 10,
  starsSpeed: 28,
} as const;
