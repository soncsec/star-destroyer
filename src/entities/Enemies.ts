import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import {
  DEPTH,
  ENEMY_COMMON,
  ENEMY_TYPES,
  GAME_HEIGHT,
  GAME_WIDTH,
  type EnemyKind,
} from '../config/tuning';
import { offScreen, type Box } from '../logic/collision';
import { applyDamage } from '../logic/enemy';
import { startMove, stepMove, type MoveState } from '../logic/enemyMoves';

export interface EnemySlot {
  sprite: Phaser.GameObjects.Sprite;
  kind: EnemyKind;
  hp: number;
  flash: number;
  /** Seconds until this enemy's next shot (counts down only while fully on screen). */
  fireIn: number;
  move: MoveState;
  /** Set once any part of it has been on screen; it is removed after it leaves again. */
  entered: boolean;
}

/** Pool of enemies of every type; a slot takes on a type's sprite and movement when spawned. */
export class Enemies {
  private readonly slots: EnemySlot[] = [];

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < ENEMY_COMMON.poolSize; i++) {
      const sprite = scene.add
        .sprite(0, 0, ENEMY_TYPES.grunt.sprite)
        .setDepth(DEPTH.enemies)
        .setActive(false)
        .setVisible(false);
      const move = startMove(ENEMY_TYPES.grunt.move, 0, 0);
      this.slots.push({ sprite, kind: 'grunt', hp: 0, flash: 0, fireIn: 0, move, entered: false });
    }
  }

  /**
   * Spawns an enemy of `kind` at `x`, just above the screen unless `y` is given
   * (tests use `y`), first shooting after `firstShot` seconds on screen.
   * Returns false if the pool is full.
   */
  spawn(kind: EnemyKind, x: number, firstShot: number, y?: number): boolean {
    const slot = this.slots.find((s) => !s.sprite.active);
    if (!slot) return false;
    const type = ENEMY_TYPES[kind];
    slot.kind = kind;
    slot.hp = type.hp;
    slot.flash = 0;
    slot.fireIn = firstShot;
    slot.entered = false;
    slot.sprite.setTexture(type.sprite);
    slot.move = startMove(type.move, x, y ?? -slot.sprite.height / 2);
    slot.sprite
      .setPosition(slot.move.x, slot.move.y)
      .setAlpha(1)
      .setActive(true)
      .setVisible(true)
      .play(animKey(type.sprite));
    return true;
  }

  /** Moves every enemy; `target` is the ship (divers aim at it when they start a dive). */
  update(dtSeconds: number, target: { x: number; y: number }): void {
    for (const slot of this.active()) {
      slot.move = stepMove(ENEMY_TYPES[slot.kind].move, slot.move, dtSeconds, target);
      slot.sprite.setPosition(slot.move.x, slot.move.y);
      slot.flash = Math.max(0, slot.flash - dtSeconds);
      slot.sprite.setAlpha(slot.flash > 0 ? 0.35 : 1);
      // Removed only after it has been on screen and left again (divers can leave sideways).
      const off = offScreen(this.hitbox(slot), GAME_WIDTH, GAME_HEIGHT);
      if (!off) slot.entered = true;
      else if (slot.entered) this.release(slot);
    }
  }

  /** Whether the whole enemy is inside the screen (it may only shoot then). */
  onScreen(slot: EnemySlot): boolean {
    const half = slot.sprite.height / 2;
    return slot.sprite.y - half >= 0 && slot.sprite.y + half <= GAME_HEIGHT;
  }

  active(): EnemySlot[] {
    return this.slots.filter((s) => s.sprite.active);
  }

  hitbox(slot: EnemySlot): Box {
    const h = ENEMY_TYPES[slot.kind].hitbox;
    return { x: slot.sprite.x, y: slot.sprite.y + h.offsetY, w: h.w, h: h.h };
  }

  /** Damages an enemy. Returns true if it was destroyed (and removed). */
  hit(slot: EnemySlot, amount: number): boolean {
    const r = applyDamage(slot.hp, amount);
    slot.hp = r.hp;
    slot.flash = ENEMY_COMMON.hitFlash;
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
