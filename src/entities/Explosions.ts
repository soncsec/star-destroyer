import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { DEPTH, EXPLOSION } from '../config/tuning';

/** Pool of one-shot explosion animations (the enemy explosion unless told otherwise). */
export class Explosions {
  private readonly pool: Phaser.GameObjects.Sprite[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly sprite: string = EXPLOSION.sprite,
    poolSize: number = EXPLOSION.poolSize,
    depth: number = DEPTH.explosions,
  ) {
    for (let i = 0; i < poolSize; i++) {
      const s = scene.add.sprite(0, 0, sprite).setDepth(depth).setActive(false).setVisible(false);
      s.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.setActive(false).setVisible(false));
      this.pool.push(s);
    }
  }

  /** Plays an explosion at (x, y). If all are busy, the oldest-started is reused. */
  play(x: number, y: number): void {
    const s = this.pool.find((e) => !e.active) ?? this.pool[0];
    if (!s) return;
    s.setPosition(x, y).setActive(true).setVisible(true).play(animKey(this.sprite), false);
    // Move it to the back of the list so reuse picks the oldest one first.
    this.pool.push(...this.pool.splice(this.pool.indexOf(s), 1));
  }

  /** How many explosions are playing right now. */
  activeCount(): number {
    return this.pool.filter((e) => e.active).length;
  }
}
