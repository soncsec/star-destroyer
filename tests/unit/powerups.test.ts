import { describe, expect, it } from 'vitest';
import {
  collectPowerUp,
  killCanDrop,
  loseLife,
  startPowerUps,
  type KillCause,
} from '../../src/logic/powerups';
import { SHIELD, WEAPON_LEVELS } from '../../src/config/tuning';

const rules = { maxWeaponLevel: 3, shield: { duration: 30, warnAt: 3 } };

describe('power-ups', () => {
  it('a game or a life starts with the small gun and no shield', () => {
    expect(startPowerUps()).toEqual({ weaponLevel: 1, shield: 0 });
  });

  it('a weapon gem raises the gun one level, up to the top', () => {
    let p = startPowerUps();
    const levels: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = collectPowerUp(p, 'weapon', rules);
      expect(r.clearScreen).toBe(false);
      p = r.powerUps;
      levels.push(p.weaponLevel);
    }
    expect(levels).toEqual([2, 3, 3, 3]);
    expect(p.shield).toBe(0);
  });

  it('a shield gem gives the full shield time, even with time left', () => {
    const fresh = collectPowerUp(startPowerUps(), 'shield', rules).powerUps;
    expect(fresh).toEqual({ weaponLevel: 1, shield: 30 });
    const reset = collectPowerUp({ weaponLevel: 2, shield: 4 }, 'shield', rules).powerUps;
    expect(reset).toEqual({ weaponLevel: 2, shield: 30 });
  });

  it('a screen-clear gem clears the screen and leaves the gun and shield alone', () => {
    const p = { weaponLevel: 3, shield: 12 };
    const r = collectPowerUp(p, 'clear', rules);
    expect(r.clearScreen).toBe(true);
    expect(r.powerUps).toEqual(p);
    expect(r.powerUps).not.toBe(p);
  });

  it('every power-up is lost on death', () => {
    expect(loseLife()).toEqual(startPowerUps());
  });

  it('only a kill by a shot can drop a gem', () => {
    const causes: KillCause[] = ['shot', 'crash', 'shield', 'clear'];
    expect(causes.filter(killCanDrop)).toEqual(['shot']);
  });

  it('the tuned rules: three weapon levels and a 10-second shield (owner, 2026-10-18)', () => {
    expect(WEAPON_LEVELS).toHaveLength(3);
    expect(SHIELD.duration).toBe(10);
  });
});
