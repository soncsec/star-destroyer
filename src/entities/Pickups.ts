import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, POWERUPS } from '../config/tuning';
import { offScreen, type Box } from '../logic/collision';
import type { PowerUpKind } from '../logic/drops';

export interface PickupSlot {
  sprite: Phaser.GameObjects.Sprite;
  kind: PowerUpKind;
}

/** Spinning gems that drift down after a kill; the ship collects them by touching. */
export class Pickups {
  private readonly slots: PickupSlot[] = [];

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < POWERUPS.poolSize; i++) {
      const sprite = scene.add
        .sprite(0, 0, POWERUPS.sprites.weapon)
        .setDepth(DEPTH.pickups)
        .setActive(false)
        .setVisible(false);
      this.slots.push({ sprite, kind: 'weapon' });
    }
  }

  /** Drops a pickup at (x, y). False if every pooled pickup is already out. */
  spawn(kind: PowerUpKind, x: number, y: number): boolean {
    const slot = this.slots.find((s) => !s.sprite.active);
    if (!slot) return false;
    const texture = POWERUPS.sprites[kind];
    slot.kind = kind;
    slot.sprite
      .setTexture(texture)
      .setPosition(x, y)
      .setActive(true)
      .setVisible(true)
      .play(animKey(texture));
    return true;
  }

  update(dtSeconds: number): void {
    for (const slot of this.active()) {
      slot.sprite.y += POWERUPS.fallSpeed * dtSeconds;
      if (slot.sprite.y > GAME_HEIGHT && offScreen(this.hitbox(slot), GAME_WIDTH, GAME_HEIGHT)) {
        this.release(slot);
      }
    }
  }

  active(): PickupSlot[] {
    return this.slots.filter((s) => s.sprite.active);
  }

  hitbox(slot: PickupSlot): Box {
    return { x: slot.sprite.x, y: slot.sprite.y, ...POWERUPS.hitbox };
  }

  /** Removes a pickup (collected, or the game is resetting). */
  release(slot: PickupSlot): void {
    slot.sprite.stop();
    slot.sprite.setActive(false).setVisible(false);
  }

  clear(): void {
    for (const slot of this.active()) this.release(slot);
  }
}
