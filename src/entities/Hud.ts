import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, HUD } from '../config/tuning';
import { formatScore, healthPips } from '../logic/hud';

/** Score (top left), health pips under it, lives (top right). Drawn above everything. */
export class Hud {
  private readonly score: Phaser.GameObjects.Text;
  private readonly lives: Phaser.GameObjects.Text;
  private readonly shield: Phaser.GameObjects.Text;
  private readonly pips: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, hitsPerLife: number) {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD.font,
      fontSize: `${HUD.fontSize}px`,
      color: HUD.color,
    };
    const m = HUD.margin;
    this.score = scene.add
      .text(m, m, '', style)
      .setShadow(1, 1, HUD.shadow, 0, false, true)
      .setDepth(DEPTH.hud);
    this.lives = scene.add
      .text(GAME_WIDTH - m, m, '', style)
      .setOrigin(1, 0)
      .setShadow(1, 1, HUD.shadow, 0, false, true)
      .setDepth(DEPTH.hud);
    // Shield countdown under the lives, only while the shield is up (M3.3).
    this.shield = scene.add
      .text(GAME_WIDTH - m, m + HUD.fontSize + 3, '', { ...style, color: '#2de2e6' })
      .setOrigin(1, 0)
      .setShadow(1, 1, HUD.shadow, 0, false, true)
      .setDepth(DEPTH.hud);
    const { w, h, gap } = HUD.pip;
    for (let i = 0; i < hitsPerLife; i++) {
      this.pips.push(
        scene.add
          .rectangle(m + i * (w + gap), m + HUD.fontSize + 3, w, h, HUD.pip.on)
          .setOrigin(0)
          .setDepth(DEPTH.hud),
      );
    }
  }

  /** `shieldSeconds` 0 hides the shield countdown. */
  update(score: number, hits: number, lives: number, shieldSeconds = 0): void {
    this.score.setText(`SCORE ${formatScore(score)}`);
    this.shield.setText(shieldSeconds > 0 ? `SHIELD ${shieldSeconds}` : '');
    this.lives.setText(`LIVES ${lives}`);
    healthPips(hits, this.pips.length, lives).forEach((on, i) =>
      this.pips[i]?.setFillStyle(on ? HUD.pip.on : HUD.pip.off),
    );
  }

  /** What is on screen, for the e2e test hook. */
  read(): { score: string; lives: string; pips: boolean[]; shield: string } {
    return {
      score: this.score.text,
      lives: this.lives.text,
      shield: this.shield.text,
      pips: this.pips.map((p) => p.fillColor === HUD.pip.on),
    };
  }
}
