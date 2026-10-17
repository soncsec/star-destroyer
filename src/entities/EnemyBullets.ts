import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { DEPTH, ENEMY_FIRE, GAME_HEIGHT, GAME_WIDTH } from '../config/tuning';
import { offScreen, type Box } from '../logic/collision';
import type { Vec } from '../logic/enemyFire';

interface Shot {
  sprite: Phaser.GameObjects.Sprite;
  v: Vec;
}

/** Enemy shots: pooled sprites that fly in a straight line until they leave the screen. */
export class EnemyBullets {
  private readonly pool: Shot[] = [];

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < ENEMY_FIRE.poolSize; i++) {
      const sprite = scene.add
        .sprite(0, 0, ENEMY_FIRE.sprite)
        .setDepth(DEPTH.enemyShots)
        .setActive(false)
        .setVisible(false);
      this.pool.push({ sprite, v: { x: 0, y: 0 } });
    }
  }

  /** Fires from (x, y) with velocity `v` in pixels per second. False if the pool is full. */
  fire(x: number, y: number, v: Vec): boolean {
    const shot = this.pool.find((s) => !s.sprite.active);
    if (!shot) return false;
    shot.v = v;
    shot.sprite.setPosition(x, y).setActive(true).setVisible(true).play(animKey(ENEMY_FIRE.sprite));
    return true;
  }

  update(dtSeconds: number): void {
    for (const shot of this.active()) {
      shot.sprite.x += shot.v.x * dtSeconds;
      shot.sprite.y += shot.v.y * dtSeconds;
      if (offScreen(this.hitbox(shot), GAME_WIDTH, GAME_HEIGHT)) this.release(shot);
    }
  }

  active(): Shot[] {
    return this.pool.filter((s) => s.sprite.active);
  }

  hitbox(shot: Shot): Box {
    return { x: shot.sprite.x, y: shot.sprite.y, ...ENEMY_FIRE.hitbox };
  }

  release(shot: Shot): void {
    shot.sprite.stop();
    shot.sprite.setActive(false).setVisible(false);
  }

  /** Removes every enemy shot (screen clear, or tests). */
  clear(): void {
    for (const shot of this.active()) this.release(shot);
  }
}
