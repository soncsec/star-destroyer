import Phaser from 'phaser';
import { DEPTH, SHIELD } from '../config/tuning';
import { bubbleVisible, shieldUp, type Shield } from '../logic/shield';

const LOOP = 'shield-loop';
const BREAK = 'shield-break';

/** The energy bubble drawn around the ship while the shield is up; it breaks when it runs out. */
export class ShieldBubble {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private wasUp = false;

  constructor(scene: Phaser.Scene) {
    const frames = (list: readonly number[]) =>
      list.map((frame) => ({ key: SHIELD.sprite, frame }));
    if (!scene.anims.exists(LOOP)) {
      scene.anims.create({
        key: LOOP,
        frames: frames(SHIELD.loopFrames),
        frameRate: SHIELD.frameRate,
        repeat: -1,
      });
    }
    if (!scene.anims.exists(BREAK)) {
      scene.anims.create({
        key: BREAK,
        frames: frames(SHIELD.breakFrames),
        frameRate: SHIELD.frameRate * 2,
        repeat: 0,
      });
    }
    this.sprite = scene.add
      .sprite(0, 0, SHIELD.sprite, 0)
      .setScale(SHIELD.scale)
      .setDepth(DEPTH.player + 1)
      .setVisible(false);
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + BREAK, () =>
      this.sprite.setVisible(false),
    );
  }

  update(x: number, y: number, shield: Shield): void {
    this.sprite.setPosition(x, y);
    const up = shieldUp(shield);
    if (up && !this.wasUp) this.sprite.play(LOOP);
    if (!up && this.wasUp) this.sprite.setVisible(true).play(BREAK); // pops when it runs out
    this.wasUp = up;
    if (up) this.sprite.setVisible(bubbleVisible(shield, SHIELD, SHIELD.blinkHz));
  }

  /** Gone at once (a new life or game), without the break animation. */
  reset(): void {
    this.wasUp = false;
    this.sprite.stop();
    this.sprite.setVisible(false);
  }

  get visible(): boolean {
    return this.sprite.visible;
  }
}
