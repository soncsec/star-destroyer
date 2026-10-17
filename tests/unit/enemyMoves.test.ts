import { describe, expect, it } from 'vitest';
import {
  spawnMargin,
  startMove,
  stepMove,
  type MovePattern,
  type MoveState,
} from '../../src/logic/enemyMoves';

const ship = { x: 200, y: 272 };
const run = (p: MovePattern, s: MoveState, seconds: number, dt = 1 / 60): MoveState => {
  for (let t = 0; t < seconds - 1e-9; t += dt) s = stepMove(p, s, dt, ship);
  return s;
};

describe('straight', () => {
  const p: MovePattern = { kind: 'straight', speed: 45 };
  it('flies straight down at its speed', () => {
    const s = stepMove(p, startMove(p, 100, -20), 2, ship);
    expect(s).toMatchObject({ x: 100, y: 70, t: 2 });
  });
});

describe('weave', () => {
  const p: MovePattern = { kind: 'weave', speed: 30, amplitude: 40, period: 2 };
  it('sways around its spawn x while descending', () => {
    const quarter = stepMove(p, startMove(p, 100, 0), 0.5, ship);
    expect(quarter.x).toBeCloseTo(140);
    expect(quarter.y).toBeCloseTo(15);
    const half = stepMove(p, quarter, 0.5, ship);
    expect(half.x).toBeCloseTo(100);
    const threeQuarters = stepMove(p, half, 0.5, ship);
    expect(threeQuarters.x).toBeCloseTo(60);
  });
  it('never strays more than the amplitude from its spawn x', () => {
    let s = startMove(p, 100, 0);
    for (let i = 0; i < 600; i++) {
      s = stepMove(p, s, 1 / 60, ship);
      expect(Math.abs(s.x - 100)).toBeLessThanOrEqual(40 + 1e-9);
    }
  });
});

describe('dive', () => {
  const p: MovePattern = {
    kind: 'dive',
    enterSpeed: 60,
    hoverY: 60,
    hoverTime: 0.8,
    diveSpeed: 150,
  };

  it('flies in, stops on the hover line, and waits', () => {
    const s = run(p, startMove(p, 100, -20), 1.5);
    expect(s).toMatchObject({ phase: 'hover', y: 60, x: 100 });
  });

  it('then dives toward where the ship was, at dive speed', () => {
    const s = run(p, startMove(p, 100, -20), 1.5 + 0.8 + 0.05);
    expect(s.phase).toBe('dive');
    expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(150);
    // Heading at the ship's position when the dive began.
    expect(s.vx / s.vy).toBeCloseTo((200 - 100) / (272 - 60), 1);
  });

  it("doesn't steer after the dive starts, so the ship can dodge", () => {
    const diving = run(p, startMove(p, 100, -20), 2.4);
    const moved = stepMove(p, diving, 0.5, { x: 0, y: 272 });
    expect(moved.vx).toBe(diving.vx);
    expect(moved.x).toBeCloseTo(diving.x + diving.vx * 0.5);
    expect(moved.y).toBeCloseTo(diving.y + diving.vy * 0.5);
  });

  it('always dives downward, even at a ship level with it', () => {
    const hover = run(p, startMove(p, 100, -20), 2.2);
    const d = stepMove(p, { ...hover, hoverLeft: 0.01 }, 0.02, { x: 300, y: 60 });
    expect(d.phase).toBe('dive');
    expect(d.vy).toBeGreaterThan(0);
  });
});

describe('stepMove / spawnMargin', () => {
  it('rejects negative time', () => {
    const p: MovePattern = { kind: 'straight', speed: 1 };
    expect(() => stepMove(p, startMove(p, 0, 0), -1, ship)).toThrow(RangeError);
  });
  it('keeps weavers far enough from the edges to sway without leaving the screen', () => {
    expect(spawnMargin({ kind: 'weave', speed: 1, amplitude: 40, period: 2 }, 14)).toBe(58);
    expect(spawnMargin({ kind: 'straight', speed: 1 }, 12)).toBe(16);
  });
});
