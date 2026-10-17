/**
 * Asteroids (M2.5). Plain TypeScript, no Phaser (ADR-006).
 *
 * Rocks drift in a straight line while spinning. A large rock that is
 * destroyed splits into small pieces fanned out around its direction of
 * travel; small pieces don't split again.
 */
import type { Rng } from './rng';

export interface Rock {
  x: number;
  y: number;
  /** Velocity in pixels per second. */
  vx: number;
  vy: number;
  /** Rotation in degrees, and spin in degrees per second. */
  angle: number;
  spin: number;
}

export interface SplitRules {
  /** How many small pieces a large rock breaks into. */
  pieces: number;
  /** Speed of each piece, pixels per second. */
  speed: number;
  /** The pieces fan out across this many degrees, centred on straight down. */
  fanDeg: number;
  /** Each piece's direction is nudged by up to ± this many degrees (seeded). */
  jitterDeg: number;
  /** Most spin a piece gets, degrees per second either way (seeded). */
  maxSpin: number;
}

export function stepRock(r: Rock, dt: number): Rock {
  if (dt < 0) throw new RangeError('dt must not be negative');
  return { ...r, x: r.x + r.vx * dt, y: r.y + r.vy * dt, angle: (r.angle + r.spin * dt) % 360 };
}

/**
 * The small pieces a large rock at (x, y) breaks into: spread evenly across
 * the fan, each nudged a little, all heading downward so none fly back up at
 * the top of the screen. They keep a share of the parent's velocity.
 */
export function splitRock(parent: Rock, rules: SplitRules, rng: Rng): Rock[] {
  if (rules.pieces < 1) throw new RangeError('a split needs at least one piece');
  if (rules.fanDeg < 0 || rules.fanDeg + 2 * rules.jitterDeg >= 180) {
    throw new RangeError('the fan (plus jitter) must stay within the downward half-circle');
  }
  const out: Rock[] = [];
  for (let i = 0; i < rules.pieces; i++) {
    const share = rules.pieces === 1 ? 0.5 : i / (rules.pieces - 1);
    const deg =
      -rules.fanDeg / 2 + share * rules.fanDeg + rng.range(-rules.jitterDeg, rules.jitterDeg);
    const rad = (deg * Math.PI) / 180;
    out.push({
      x: parent.x,
      y: parent.y,
      // 0° is straight down; positive turns toward +x.
      vx: Math.sin(rad) * rules.speed + parent.vx * 0.5,
      vy: Math.cos(rad) * rules.speed + parent.vy * 0.5,
      angle: rng.range(0, 360),
      spin: rng.range(-rules.maxSpin, rules.maxSpin),
    });
  }
  return out;
}
