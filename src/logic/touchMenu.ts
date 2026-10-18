/**
 * The on-screen buttons for touchscreens (owner request 2026-10-18). Plain
 * TypeScript, no Phaser (ADR-006).
 *
 * While playing there is one small pause button. Paused, the menu offers
 * resume, quit, sound and full screen; quitting asks first, with yes and no.
 * The buttons do what the keys do (P, Q, Y, N, M, F).
 */
import type { Box } from './collision';
import type { Mode } from './controls';
import type { Vec } from './enemyFire';

export type TouchAction = 'pause' | 'resume' | 'quit' | 'yes' | 'no' | 'mute' | 'fullscreen';

export interface TouchButton {
  action: TouchAction;
  label: string;
  /** Center, width and height, in game pixels. */
  box: Box;
}

export interface TouchLayout {
  screen: { w: number; h: number };
  /** The pause button, top center (between the score and the lives). */
  pause: { y: number; w: number; h: number };
  /** Menu buttons: size, the first one's center y, and the gap between them. */
  menu: { w: number; h: number; top: number; gap: number };
}

/** The buttons on screen for this control mode (none after game over but the quit ones). */
export function touchButtons(
  mode: Mode,
  ctx: { gameOver: boolean; muted: boolean },
  layout: TouchLayout,
): TouchButton[] {
  const cx = layout.screen.w / 2;
  const column = (items: [TouchAction, string][]): TouchButton[] =>
    items.map(([action, label], i) => ({
      action,
      label,
      box: {
        x: cx,
        y: layout.menu.top + i * (layout.menu.h + layout.menu.gap),
        w: layout.menu.w,
        h: layout.menu.h,
      },
    }));
  if (mode === 'confirmQuit')
    return column([
      ['yes', 'YES, QUIT'],
      ['no', 'NO'],
    ]);
  if (mode === 'paused')
    return column([
      ['resume', 'RESUME'],
      ['quit', 'QUIT'],
      ['mute', ctx.muted ? 'SOUND ON' : 'SOUND OFF'],
      ['fullscreen', 'FULL SCREEN'],
    ]);
  if (ctx.gameOver) return [];
  const { y, w, h } = layout.pause;
  return [{ action: 'pause', label: 'II', box: { x: cx, y, w, h } }];
}

/** The button under `point`, if any. */
export function buttonAt(buttons: readonly TouchButton[], point: Vec): TouchButton | null {
  return (
    buttons.find(
      (b) =>
        Math.abs(point.x - b.box.x) <= b.box.w / 2 && Math.abs(point.y - b.box.y) <= b.box.h / 2,
    ) ?? null
  );
}
