import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, HUD } from '../config/tuning';
import { formatScore, healthPips } from '../logic/hud';

/** Score (top left), health pips under it, lives (top right). Drawn above everything. */
export class Hud {
  private readonly score: Phaser.GameObjects.Text;
  private readonly lives: Phaser.GameObjects.Text;
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

  update(score: number, hits: number, lives: number): void {
    this.score.setText(`SCORE ${formatScore(score)}`);
    this.lives.setText(`LIVES ${lives}`);
    healthPips(hits, this.pips.length, lives).forEach((on, i) =>
      this.pips[i]?.setFillStyle(on ? HUD.pip.on : HUD.pip.off),
    );
  }

  /** What is on screen, for the e2e test hook. */
  read(): { score: string; lives: string; pips: boolean[] } {
    return {
      score: this.score.text,
      lives: this.lives.text,
      pips: this.pips.map((p) => p.fillColor === HUD.pip.on),
    };
  }
}
