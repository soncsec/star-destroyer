import { describe, expect, it } from 'vitest';
import {
  pressKey,
  running,
  startControls,
  tickLegend,
  type ControlKey,
  type ControlState,
} from '../../src/logic/controls';

const play = { gameOver: false };
const over = { gameOver: true };
const press = (s: ControlState, ...keys: ControlKey[]) =>
  keys.reduce((acc, k) => pressKey(acc, k, play).state, s);

describe('pause', () => {
  it('P pauses and P again resumes', () => {
    const paused = press(startControls(false), 'pause');
    expect(paused.mode).toBe('paused');
    expect(running(paused)).toBe(false);
    expect(running(press(paused, 'pause'))).toBe(true);
  });
  it('Esc works the same as P', () => {
    expect(press(startControls(false), 'escape').mode).toBe('paused');
    expect(press(startControls(false), 'escape', 'escape').mode).toBe('playing');
  });
  it("can't pause after game over", () => {
    expect(pressKey(startControls(false), 'pause', over).state.mode).toBe('playing');
  });
});

describe('quit', () => {
  it('Q asks first and the game stops while asking', () => {
    const asking = press(startControls(false), 'quit');
    expect(asking.mode).toBe('confirmQuit');
    expect(running(asking)).toBe(false);
  });
  it('Y quits', () => {
    expect(pressKey(press(startControls(false), 'quit'), 'yes', play).quit).toBe(true);
  });
  it('N or Esc goes back to where you were (playing or paused)', () => {
    expect(press(startControls(false), 'quit', 'no').mode).toBe('playing');
    expect(press(startControls(false), 'pause', 'quit', 'escape').mode).toBe('paused');
  });
  it('other keys wait for an answer', () => {
    const asking = press(startControls(false), 'quit');
    for (const k of ['pause', 'quit'] as const) {
      expect(pressKey(asking, k, play)).toEqual({ state: asking, quit: false });
    }
  });
  it('Y does nothing unless the question is showing', () => {
    expect(pressKey(startControls(false), 'yes', play)).toEqual({
      state: startControls(false),
      quit: false,
    });
  });
  it('quitting still works after game over', () => {
    const asking = pressKey(startControls(false), 'quit', over).state;
    expect(pressKey(asking, 'yes', over).quit).toBe(true);
  });
});

describe('legend', () => {
  it('H toggles it in any mode, without changing the mode', () => {
    const s = press(startControls(false), 'pause', 'help');
    expect(s).toMatchObject({ legend: true, mode: 'paused' });
    expect(press(s, 'help').legend).toBe(false);
    expect(press(startControls(false), 'quit', 'help').mode).toBe('confirmQuit');
  });
  it('the start-of-game legend hides itself after a few seconds', () => {
    const s = startControls(true);
    expect(tickLegend(s, 3.9, 4).legend).toBe(true);
    expect(tickLegend(s, 4, 4).legend).toBe(false);
    expect(tickLegend(startControls(false), 10, 4)).toEqual(startControls(false));
  });
});
