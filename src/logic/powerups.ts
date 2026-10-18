/**
 * Power-up state and its rules (M3.6). Plain TypeScript, no Phaser (ADR-006).
 *
 * Owner decisions: a weapon gem raises the gun one level (up to the top), a
 * shield gem sets the shield to its full time, a screen-clear gem clears the
 * screen. Every power-up is lost on death. Only enemies and asteroids shot
 * down can drop a gem: not crashes, shield rams or screen-clear kills (so one
 * clear can't set off another).
 */
import type { PowerUpKind } from './drops';
import { collectShield, type Shield, type ShieldRules } from './shield';
import { levelUp } from './weaponLevels';

export interface PowerUps {
  /** 1 = the starting gun. */
  weaponLevel: number;
  /** Seconds of shield left; 0 = none. */
  shield: Shield;
}

export interface PowerUpRules {
  maxWeaponLevel: number;
  shield: ShieldRules;
}

/** What a new game or a new life starts with: the small gun and no shield. */
export const startPowerUps = (): PowerUps => ({ weaponLevel: 1, shield: 0 });

/** Collecting a gem. `clearScreen` says whether the screen must be cleared now. */
export function collectPowerUp(
  p: PowerUps,
  kind: PowerUpKind,
  rules: PowerUpRules,
): { powerUps: PowerUps; clearScreen: boolean } {
  switch (kind) {
    case 'weapon':
      return {
        powerUps: { ...p, weaponLevel: levelUp(p.weaponLevel, rules.maxWeaponLevel) },
        clearScreen: false,
      };
    case 'shield':
      return {
        powerUps: { ...p, shield: collectShield(p.shield, rules.shield) },
        clearScreen: false,
      };
    case 'clear':
      return { powerUps: { ...p }, clearScreen: true };
  }
}

/** Owner rule: every power-up is lost on death. */
export const loseLife = (): PowerUps => startPowerUps();

/** How an enemy or asteroid was destroyed. */
export type KillCause = 'shot' | 'crash' | 'shield' | 'clear';

/** Whether a kill may drop a gem: only when it was shot down. */
export const killCanDrop = (cause: KillCause): boolean => cause === 'shot';
