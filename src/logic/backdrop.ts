/**
 * Background props (M5.4): single images such as planets that drift down the
 * screen behind the action and come round again. Plain TypeScript, no Phaser.
 */

/**
 * The prop's center y after moving `dy` pixels down from `y`. Once it has
 * fully left the bottom of the screen it comes back in above the top, `gap`
 * pixels later.
 */
export function driftY(
  y: number,
  dy: number,
  height: number,
  screenH: number,
  gap: number,
): number {
  if (height <= 0) throw new RangeError('height must be positive');
  if (gap < 0) throw new RangeError('gap must not be negative');
  const top = -height / 2 - gap;
  const bottom = screenH + height / 2;
  let next = y + dy;
  const span = bottom - top;
  while (next > bottom) next -= span;
  return next;
}
