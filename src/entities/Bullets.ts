import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, WEAPON } from '../config/tuning';
import { offScreen, type Box } from '../logic/collision';

/**
 * The player's shots. Sprites are created once and reused (object pooling) so firing
 * never allocates during play.
 */
export class Bullets {
  private readonly pool: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < WEAPON.poolSize; i++) {
      const s = scene.add
        .sprite(0, 0, WEAPON.sprite)
        .setAngle(-90) // the art points right; rotate it to point up
        .setDepth(DEPTH.playerShots)
        .setActive(false)
        .setVisible(false);
      this.pool.push(s);
    }
  }

  /** Fires a shot from (x, y). Returns false if every pooled shot is already in flight. */
  fire(x: number, y: number): boolean {
    const s = this.pool.find((b) => !b.active);
    if (!s) return false;
    s.setPosition(x, y).setActive(true).setVisible(true).play(animKey(WEAPON.sprite));
    return true;
  }

  update(dtSeconds: number): void {
    for (const s of this.pool) {
      if (!s.active) continue;
      s.y -= WEAPON.bulletSpeed * dtSeconds;
      if (offScreen(this.hitbox(s), GAME_WIDTH, GAME_HEIGHT)) this.release(s);
    }
  }

  /** Shots currently in flight. */
  active(): Phaser.GameObjects.Sprite[] {
    return this.pool.filter((b) => b.active);
  }

  hitbox(s: Phaser.GameObjects.Sprite): Box {
    return { x: s.x, y: s.y, w: WEAPON.hitbox.w, h: WEAPON.hitbox.h };
  }

  release(s: Phaser.GameObjects.Sprite): void {
    s.stop();
    s.setActive(false).setVisible(false);
  }
}
