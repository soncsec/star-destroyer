import { describe, expect, it } from 'vitest';
import { TOUCH } from '../../src/config/tuning';
import { buttonAt, touchButtons, type TouchLayout } from '../../src/logic/touchMenu';

const layout: TouchLayout = {
  screen: { w: 256, h: 320 },
  pause: { y: 10, w: 24, h: 16 },
  menu: { w: 160, h: 28, top: 120, gap: 8 },
};
const ctx = { gameOver: false, muted: false, fullscreen: true };

describe('touch buttons (owner request 2026-10-18)', () => {
  it('while playing: just the pause button, top center', () => {
    expect(touchButtons('playing', ctx, layout)).toEqual([
      { action: 'pause', label: 'II', box: { x: 128, y: 10, w: 24, h: 16 } },
    ]);
  });

  it('after game over: no pause button', () => {
    expect(touchButtons('playing', { ...ctx, gameOver: true }, layout)).toEqual([]);
  });

  it('paused: resume, quit, sound and full screen, stacked down the middle', () => {
    const b = touchButtons('paused', ctx, layout);
    expect(b.map((x) => x.action)).toEqual(['resume', 'quit', 'mute', 'fullscreen']);
    expect(b.map((x) => x.box.y)).toEqual([120, 156, 192, 228]);
    expect(b.every((x) => x.box.x === 128)).toBe(true);
    expect(b[2]?.label).toBe('SOUND OFF');
    expect(touchButtons('paused', { ...ctx, muted: true }, layout)[2]?.label).toBe('SOUND ON');
  });

  it('paused where the browser has no full screen (iPhone Safari): no such button', () => {
    const b = touchButtons('paused', { ...ctx, fullscreen: false }, layout);
    expect(b.map((x) => x.action)).toEqual(['resume', 'quit', 'mute']);
  });

  it('asking to quit: yes or no', () => {
    expect(touchButtons('confirmQuit', ctx, layout).map((b) => b.action)).toEqual(['yes', 'no']);
  });

  it('finds the button under a finger, edges included', () => {
    const b = touchButtons('paused', ctx, layout);
    expect(buttonAt(b, { x: 128, y: 156 })?.action).toBe('quit');
    expect(buttonAt(b, { x: 48, y: 106 })?.action).toBe('resume');
    expect(buttonAt(b, { x: 128, y: 139 })).toBeNull(); // the gap between buttons
    expect(buttonAt(b, { x: 20, y: 120 })).toBeNull();
    expect(buttonAt([], { x: 0, y: 0 })).toBeNull();
  });

  it('the tuned layout fits: buttons big enough to tap, on screen, not overlapping', () => {
    const tuned = { screen: { w: 256, h: 320 }, ...TOUCH };
    for (const mode of ['playing', 'paused', 'confirmQuit'] as const) {
      const b = touchButtons(mode, ctx, tuned);
      for (const x of b) {
        expect(x.box.h, x.action).toBeGreaterThanOrEqual(TOUCH.minButton);
        expect(x.box.w, x.action).toBeGreaterThanOrEqual(TOUCH.minButton);
        expect(x.box.y - x.box.h / 2).toBeGreaterThanOrEqual(0);
        expect(x.box.y + x.box.h / 2).toBeLessThanOrEqual(320);
        expect(x.box.x - x.box.w / 2).toBeGreaterThanOrEqual(0);
      }
      for (let i = 1; i < b.length; i++) {
        const a = b[i - 1]?.box;
        const c = b[i]?.box;
        if (a && c) expect(c.y - c.h / 2).toBeGreaterThan(a.y + a.h / 2);
      }
    }
    // The pause button sits between the score (left) and the lives (right).
    expect(TOUCH.pause.w).toBeLessThanOrEqual(32);
    expect(TOUCH.minButton * 1.5).toBeGreaterThanOrEqual(36);
  });
});
