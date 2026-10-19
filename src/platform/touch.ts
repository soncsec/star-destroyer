/**
 * Whether this is a touchscreen device (a phone or tablet): it has touch and
 * its main pointer is a finger. Laptops with touchscreens count as desktops
 * (their main pointer is a mouse), though touch steering still works there.
 */
export function isTouchDevice(): boolean {
  try {
    return navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** A "press to …" prompt in the words that suit the device. */
export const pressPrompt = (what: string, touch = isTouchDevice()): string =>
  touch ? `TAP TO ${what}` : `PRESS SPACE TO ${what}`;
