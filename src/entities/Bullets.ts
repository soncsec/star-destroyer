import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, WEAPON } from '../config/tuning';
import { offScreen, type Box } from '../logic/collision';
import { shotAngle, type Shot } from '../logic/weaponLevels';

export interface ShotSlot {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  damage: number;
  hitbox: { w: number; h: number };
}

/**
 * The player's shots. Sprites are created once and reused (object pooling), and
 * take on the current weapon level's look, speed, damage and hitbox when fired.
 */
export class Bullets {
  private readonly pool: ShotSlot[] = [];

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < WEAPON.poolSize; i++) {
      const sprite = scene.add
        .sprite(0, 0, 'shot-tracer')
        .setDepth(DEPTH.playerShots)
        .setActive(false)
        .setVisible(false);
      this.pool.push({ sprite, vx: 0, vy: 0, damage: 0, hitbox: { w: 0, h: 0 } });
    }
  }

  /** Fires one shot. Returns false if every pooled shot is already in flight. */
  fire(shot: Shot, sprite: string, hitbox: { w: number; h: number }): boolean {
    const slot = this.pool.find((b) => !b.sprite.active);
    if (!slot) return false;
    slot.vx = shot.vx;
    slot.vy = shot.vy;
    slot.damage = shot.damage;
    slot.hitbox = hitbox;
    slot.sprite
      .setTexture(sprite)
      .setPosition(shot.x, shot.y)
      .setAngle(shotAngle(shot.vx, shot.vy)) // the art points right
      .setScale(WEAPON.shotScale)
      .setActive(true)
      .setVisible(true)
      .play(animKey(sprite));
    return true;
  }

  update(dtSeconds: number): void {
    for (const slot of this.active()) {
      slot.sprite.x += slot.vx * dtSeconds;
      slot.sprite.y += slot.vy * dtSeconds;
      if (offScreen(this.hitbox(slot), GAME_WIDTH, GAME_HEIGHT)) this.release(slot);
    }
  }

  /** Shots currently in flight. */
  active(): ShotSlot[] {
    return this.pool.filter((b) => b.sprite.active);
  }

  hitbox(slot: ShotSlot): Box {
    return { x: slot.sprite.x, y: slot.sprite.y, w: slot.hitbox.w, h: slot.hitbox.h };
  }

  release(slot: ShotSlot): void {
    slot.sprite.stop();
    slot.sprite.setActive(false).setVisible(false);
  }

  clear(): void {
    for (const slot of this.active()) this.release(slot);
  }
}
