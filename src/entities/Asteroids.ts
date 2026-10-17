import Phaser from 'phaser';
import { ASTEROIDS, DEPTH, ENEMY_COMMON, GAME_HEIGHT, GAME_WIDTH } from '../config/tuning';
import { splitRock, stepRock, type Rock } from '../logic/asteroids';
import { offScreen, type Box } from '../logic/collision';
import { applyDamage } from '../logic/enemy';
import type { Rng } from '../logic/rng';

export type RockSize = 'large' | 'small';

export interface RockSlot {
  sprite: Phaser.GameObjects.Image;
  size: RockSize;
  hp: number;
  flash: number;
  rock: Rock;
  /** Set once any part of it has been on screen; it is removed after it leaves again. */
  entered: boolean;
}

/**
 * Pooled asteroids. Large rocks split into small ones when destroyed; the
 * scene decides when (shot down, or crashed into the ship).
 */
export class Asteroids {
  private readonly slots: RockSlot[] = [];

  constructor(scene: Phaser.Scene) {
    const make = (size: RockSize, count: number, texture: string): void => {
      for (let i = 0; i < count; i++) {
        const sprite = scene.add
          .image(0, 0, texture)
          .setDepth(DEPTH.asteroids)
          .setActive(false)
          .setVisible(false);
        const rock: Rock = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0 };
        this.slots.push({ sprite, size, hp: 0, flash: 0, rock, entered: false });
      }
    };
    make('large', ASTEROIDS.poolLarge, ASTEROIDS.large.sprite);
    make('small', ASTEROIDS.poolSmall, ASTEROIDS.small.sprites[0]);
  }

  /** A large rock at `x`, just above the screen unless `y` is given, drifting down. */
  spawnLarge(x: number, rng: Rng, y?: number): boolean {
    const L = ASTEROIDS.large;
    const slot = this.free('large');
    if (!slot) return false;
    this.place(slot, L.hp, ASTEROIDS.large.sprite, {
      x,
      y: y ?? -slot.sprite.height / 2,
      vx: rng.range(-L.maxDrift, L.maxDrift),
      vy: L.speed,
      angle: rng.range(0, 360),
      spin: rng.range(-L.maxSpin, L.maxSpin),
    });
    return true;
  }

  /** Breaks a large rock into small pieces where it was. Returns how many appeared. */
  split(slot: RockSlot, rng: Rng): number {
    let made = 0;
    for (const piece of splitRock(slot.rock, ASTEROIDS.split, rng)) {
      const small = this.free('small');
      if (!small) break;
      this.place(small, ASTEROIDS.small.hp, rng.pick(ASTEROIDS.small.sprites), piece);
      // Pieces start where the large rock was, already on screen.
      small.entered = true;
      made++;
    }
    return made;
  }

  update(dtSeconds: number): void {
    for (const slot of this.active()) {
      slot.rock = stepRock(slot.rock, dtSeconds);
      slot.sprite.setPosition(slot.rock.x, slot.rock.y).setAngle(slot.rock.angle);
      slot.flash = Math.max(0, slot.flash - dtSeconds);
      slot.sprite.setAlpha(slot.flash > 0 ? 0.35 : 1);
      const off = offScreen(this.hitbox(slot), GAME_WIDTH, GAME_HEIGHT);
      if (!off) slot.entered = true;
      else if (slot.entered) this.release(slot);
    }
  }

  active(): RockSlot[] {
    return this.slots.filter((s) => s.sprite.active);
  }

  hitbox(slot: RockSlot): Box {
    const { w, h } = slot.size === 'large' ? ASTEROIDS.large.hitbox : ASTEROIDS.small.hitbox;
    return { x: slot.rock.x, y: slot.rock.y, w, h };
  }

  /** Damages a rock. Returns true if it was destroyed (and removed). */
  hit(slot: RockSlot, amount: number): boolean {
    const r = applyDamage(slot.hp, amount);
    slot.hp = r.hp;
    slot.flash = ENEMY_COMMON.hitFlash;
    if (r.destroyed) this.release(slot);
    return r.destroyed;
  }

  /** Removes one rock at once (it crashed into the ship). */
  destroy(slot: RockSlot): void {
    this.release(slot);
  }

  clear(): void {
    for (const slot of this.active()) this.release(slot);
  }

  private free(size: RockSize): RockSlot | undefined {
    return this.slots.find((s) => s.size === size && !s.sprite.active);
  }

  private place(slot: RockSlot, hp: number, texture: string, rock: Rock): void {
    slot.hp = hp;
    slot.flash = 0;
    slot.entered = false;
    slot.rock = rock;
    slot.sprite
      .setTexture(texture)
      .setPosition(rock.x, rock.y)
      .setAngle(rock.angle)
      .setAlpha(1)
      .setActive(true)
      .setVisible(true);
  }

  private release(slot: RockSlot): void {
    slot.sprite.setActive(false).setVisible(false);
  }
}
