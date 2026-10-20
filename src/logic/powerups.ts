/**
 * Power-up state and its rules (M3.6). Plain TypeScript, no Phaser (ADR-006).
 *
 * Owner decisions: a weapon gem raises the gun one level (up to the top), a
 * shield gem sets the shield to its full time, a screen-clear gem clears the
 * screen, and a health gem (M7.18) refills the current life's health. Every power-up is lost on death. Only enemies and asteroids shot
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

/** What collecting a gem did. */
export interface Collected {
  powerUps: PowerUps;
  /** The screen must be cleared now. */
  clearScreen: boolean;
  /** The ship's health must be refilled now. */
  restoreHealth: boolean;
}

/** Collecting a gem. */
export function collectPowerUp(p: PowerUps, kind: PowerUpKind, rules: PowerUpRules): Collected {
  const none = { clearScreen: false, restoreHealth: false };
  switch (kind) {
    case 'weapon':
      return {
        ...none,
        powerUps: { ...p, weaponLevel: levelUp(p.weaponLevel, rules.maxWeaponLevel) },
      };
    case 'shield':
      return { ...none, powerUps: { ...p, shield: collectShield(p.shield, rules.shield) } };
    case 'clear':
      return { ...none, powerUps: { ...p }, clearScreen: true };
    case 'health':
      return { ...none, powerUps: { ...p }, restoreHealth: true };
  }
}

/** Owner rule: every power-up is lost on death. */
export const loseLife = (): PowerUps => startPowerUps();

/** How an enemy or asteroid was destroyed. */
export type KillCause = 'shot' | 'crash' | 'shield' | 'clear';

/** Whether a kill may drop a gem: only when it was shot down. */
export const killCanDrop = (cause: KillCause): boolean => cause === 'shot';
