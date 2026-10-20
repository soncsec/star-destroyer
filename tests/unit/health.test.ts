import { describe, expect, it } from 'vitest';
import {
  isGameOver,
  newHealth,
  restoreHealth,
  shipVisible,
  takeHit,
  tickHealth,
  type Health,
  type HealthRules,
} from '../../src/logic/health';

const rules: HealthRules = {
  hitsPerLife: 5,
  lives: 3,
  hitInvulnerable: 0.5,
  respawnInvulnerable: 2,
};

/** Takes `n` hits, waiting out invulnerability before each. */
function hitTimes(h: Health, n: number): Health {
  for (let i = 0; i < n; i++) h = takeHit(tickHealth(h, 10), rules).health;
  return h;
}

describe('newHealth', () => {
  it('starts with every life and no hits', () => {
    expect(newHealth(rules)).toEqual({ hits: 0, lives: 3, invulnerable: 0 });
  });
  it('rejects rules with no hits or no lives', () => {
    expect(() => newHealth({ ...rules, hitsPerLife: 0 })).toThrow(RangeError);
    expect(() => newHealth({ ...rules, lives: 0 })).toThrow(RangeError);
  });
});

describe('takeHit', () => {
  it('counts a hit and makes the ship briefly invulnerable', () => {
    expect(takeHit(newHealth(rules), rules)).toEqual({
      health: { hits: 1, lives: 3, invulnerable: 0.5 },
      result: 'hit',
    });
  });

  it('ignores hits while invulnerable, so one collision counts once', () => {
    const once = takeHit(newHealth(rules), rules).health;
    expect(takeHit(once, rules)).toEqual({ health: once, result: 'ignored' });
  });

  it('the 5th hit costs a life and respawns invulnerable for longer', () => {
    const four = hitTimes(newHealth(rules), 4);
    expect(four.hits).toBe(4);
    expect(takeHit(tickHealth(four, 10), rules)).toEqual({
      health: { hits: 0, lives: 2, invulnerable: 2 },
      result: 'lifeLost',
    });
  });

  it('3 lives × 5 hits: the 15th hit ends the game', () => {
    const fourteen = hitTimes(newHealth(rules), 14);
    expect(fourteen).toMatchObject({ hits: 4, lives: 1 });
    const last = takeHit(tickHealth(fourteen, 10), rules);
    expect(last.result).toBe('gameOver');
    expect(isGameOver(last.health)).toBe(true);
  });

  it('ignores hits after game over', () => {
    const over = hitTimes(newHealth(rules), 15);
    expect(isGameOver(over)).toBe(true);
    expect(takeHit(over, rules)).toEqual({ health: over, result: 'ignored' });
  });
});

describe('restoreHealth (the health gem, M7.18)', () => {
  it('refills the current life, keeping lives and invulnerability', () => {
    const hurt = hitTimes(newHealth(rules), 4);
    expect(hurt).toEqual({ hits: 4, lives: 3, invulnerable: 0.5 });
    expect(restoreHealth(hurt)).toEqual({ hits: 0, lives: 3, invulnerable: 0.5 });
  });

  it('gives back no lost life', () => {
    const second = hitTimes(newHealth(rules), 7);
    expect(second).toMatchObject({ hits: 2, lives: 2 });
    expect(restoreHealth(second)).toMatchObject({ hits: 0, lives: 2 });
  });

  it('after a full refill the life again takes 5 hits', () => {
    const h = restoreHealth(hitTimes(newHealth(rules), 4));
    expect(hitTimes(h, 4)).toMatchObject({ lives: 3 });
    expect(hitTimes(h, 5)).toMatchObject({ hits: 0, lives: 2 });
  });

  it('does nothing at full health or after game over', () => {
    const full = newHealth(rules);
    expect(restoreHealth(full)).toEqual(full);
    const over = hitTimes(full, 15);
    expect(isGameOver(over)).toBe(true);
    expect(restoreHealth(over)).toBe(over);
  });
});

describe('tickHealth', () => {
  it('counts invulnerability down and stops at zero', () => {
    const h: Health = { hits: 1, lives: 3, invulnerable: 0.5 };
    expect(tickHealth(h, 0.2).invulnerable).toBeCloseTo(0.3);
    expect(tickHealth(h, 5).invulnerable).toBe(0);
  });
  it('leaves a vulnerable ship unchanged', () => {
    const h = newHealth(rules);
    expect(tickHealth(h, 1)).toBe(h);
  });
  it('rejects negative time', () => {
    expect(() => tickHealth(newHealth(rules), -1)).toThrow(RangeError);
  });
});

describe('shipVisible', () => {
  it('is always visible when not invulnerable', () => {
    expect(shipVisible(newHealth(rules), 10)).toBe(true);
  });
  it('blinks while invulnerable', () => {
    const at = (t: number) => shipVisible({ hits: 0, lives: 2, invulnerable: t }, 10);
    // 10 blinks per second: visible and hidden alternate every 0.05 s
    // (0.95-1.00 hidden, 0.90-0.95 visible, 0.85-0.90 hidden, ...).
    expect([at(1.0), at(0.97), at(0.93), at(0.88)]).toEqual([true, false, true, false]);
  });
});
