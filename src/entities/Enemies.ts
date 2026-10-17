import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { DEPTH, ENEMY_BASIC, GAME_HEIGHT, GAME_WIDTH } from '../config/tuning';
import { offScreen, type Box } from '../logic/collision';
import { applyDamage } from '../logic/enemy';

interface EnemySlot {
  sprite: Phaser.GameObjects.Sprite;
  hp: number;
  flash: number;
}

/** Pool of basic enemies that fly straight down. */
export class Enemies {
  private readonly slots: EnemySlot[] = [];

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < ENEMY_BASIC.poolSize; i++) {
      const sprite = scene.add
        .sprite(0, 0, ENEMY_BASIC.sprite)
        .setDepth(DEPTH.enemies)
        .setActive(false)
        .setVisible(false);
      this.slots.push({ sprite, hp: 0, flash: 0 });
    }
  }

  /**
   * Spawns an enemy at `x`, just above the screen unless `y` is given (tests
   * use `y`). Returns false if the pool is full.
   */
  spawn(x: number, y?: number): boolean {
    const slot = this.slots.find((s) => !s.sprite.active);
    if (!slot) return false;
    slot.hp = ENEMY_BASIC.hp;
    slot.flash = 0;
    slot.sprite
      .setPosition(x, y ?? -slot.sprite.height / 2)
      .setAlpha(1)
      .setActive(true)
      .setVisible(true)
      .play(animKey(ENEMY_BASIC.sprite));
    return true;
  }

  update(dtSeconds: number): void {
    for (const slot of this.active()) {
      slot.sprite.y += ENEMY_BASIC.speed * dtSeconds;
      slot.flash = Math.max(0, slot.flash - dtSeconds);
      slot.sprite.setAlpha(slot.flash > 0 ? 0.35 : 1);
      // Only remove once it has entered and then left through the bottom.
      if (slot.sprite.y > GAME_HEIGHT && offScreen(this.hitbox(slot), GAME_WIDTH, GAME_HEIGHT)) {
        this.release(slot);
      }
    }
  }

  active(): EnemySlot[] {
    return this.slots.filter((s) => s.sprite.active);
  }

  hitbox(slot: EnemySlot): Box {
    const h = ENEMY_BASIC.hitbox;
    return { x: slot.sprite.x, y: slot.sprite.y + h.offsetY, w: h.w, h: h.h };
  }

  /** Damages an enemy. Returns true if it was destroyed (and removed). */
  hit(slot: EnemySlot, amount: number): boolean {
    const r = applyDamage(slot.hp, amount);
    slot.hp = r.hp;
    slot.flash = ENEMY_BASIC.hitFlash;
    if (r.destroyed) this.release(slot);
    return r.destroyed;
  }

  /** Removes one enemy at once (e.g. it crashed into the player). */
  destroy(slot: EnemySlot): void {
    this.release(slot);
  }

  /** Removes every enemy without an explosion. */
  clear(): void {
    for (const slot of this.active()) this.release(slot);
  }

  private release(slot: EnemySlot): void {
    slot.sprite.stop();
    slot.sprite.setActive(false).setVisible(false);
  }
}
