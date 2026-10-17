import { describe, expect, it } from 'vitest';
import {
  panelShown,
  startGameOver,
  stepGameOver,
  type GameOverState,
} from '../../src/logic/gameOver';

const rules = { showAfter: 1.2 };
/** `key`: held down this step, and (if newly pressed) a press event since the last step. */
const step = (s: GameOverState, dt: number, key: boolean, pressed = key) =>
  stepGameOver(s, dt, { held: key, pressed }, rules);

describe('game over', () => {
  it('shows the panel only after the explosion has had time to play', () => {
    let s = startGameOver();
    expect(panelShown(s, rules)).toBe(false);
    s = step(s, 1.1, false).state;
    expect(panelShown(s, rules)).toBe(false);
    s = step(s, 0.2, false).state;
    expect(panelShown(s, rules)).toBe(true);
  });

  it('ignores the key before the panel appears', () => {
    let s = startGameOver();
    for (let i = 0; i < 5; i++) {
      const r = step(s, 0.2, true);
      expect(r.restart).toBe(false);
      s = r.state;
    }
  });

  it('a key held since the moment of death never restarts the game', () => {
    let s = startGameOver();
    for (let i = 0; i < 50; i++) {
      // Held, and no new press (browser key-repeat isn't a new press).
      const r = step(s, 0.1, true, false);
      expect(r.restart).toBe(false);
      s = r.state;
    }
    expect(s.armed).toBe(false);
  });

  it('a fresh press after the panel appears restarts the game', () => {
    let s = step(startGameOver(), 1.5, true, false).state; // still held from firing
    s = step(s, 0.1, false).state; // released: armed
    expect(s.armed).toBe(true);
    expect(step(s, 0.1, false).restart).toBe(false);
    expect(step(s, 0.1, true).restart).toBe(true);
  });

  it('a quick tap between two frames still restarts (down and up before the step)', () => {
    const s = step(startGameOver(), 1.5, false).state; // panel shown, key up: armed
    expect(s.armed).toBe(true);
    expect(step(s, 0.016, false, true).restart).toBe(true); // not held now, but pressed
  });

  it('rejects negative time', () => {
    expect(() => step(startGameOver(), -1, false)).toThrow(RangeError);
  });
});
