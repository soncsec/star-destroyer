import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_OVER, GAME_WIDTH, HIGH_SCORE, HUD } from '../config/tuning';
import { formatScore } from '../logic/hud';
import { pressPrompt } from '../platform/touch';

/** The best score so far, and whether this run just set it. */
export interface HighScoreInfo {
  best: number;
  isNew: boolean;
}

/** The high-score line on a results panel: the best so far, or "NEW HIGH SCORE!". */
export function highScoreLine(text: Phaser.GameObjects.Text, high: HighScoreInfo): void {
  text
    .setText(high.isNew ? 'NEW HIGH SCORE!' : `HIGH SCORE ${formatScore(high.best)}`)
    .setColor(high.isNew ? HIGH_SCORE.newColor : HUD.color);
}

/**
 * "GAME OVER", the final score, the high score and a blinking prompt to play
 * again. Hidden until shown.
 */
export class GameOverPanel {
  private readonly parts: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[];
  private readonly title: Phaser.GameObjects.Text;
  private readonly score: Phaser.GameObjects.Text;
  private readonly high: Phaser.GameObjects.Text;
  private readonly prompt: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const text = (y: number, size: number, color: string): Phaser.GameObjects.Text =>
      scene.add
        .text(cx, y, '', { fontFamily: HUD.font, fontSize: `${size}px`, color })
        .setOrigin(0.5)
        .setShadow(1, 1, HUD.shadow, 0, false, true)
        .setDepth(DEPTH.hud + 1);
    const backdrop = scene.add
      .rectangle(cx, cy, GAME_WIDTH, 104, GAME_OVER.backdrop.color, GAME_OVER.backdrop.alpha)
      .setDepth(DEPTH.hud);
    // 16 px is twice the font's native 8 px, so it stays crisp.
    this.title = text(cy - 32, 16, GAME_OVER.titleColor).setText('GAME OVER');
    this.score = text(cy - 6, HUD.fontSize, HUD.color);
    this.high = text(cy + 10, HUD.fontSize, HUD.color);
    this.prompt = text(cy + 32, HUD.fontSize, HUD.color).setText(pressPrompt('PLAY AGAIN'));
    this.parts = [backdrop, this.title, this.score, this.high, this.prompt];
    this.show(false, 0, 0, { best: 0, isNew: false });
  }

  /** Shows or hides the panel; `t` (seconds shown) drives the prompt's blink. */
  show(visible: boolean, finalScore: number, t: number, high: HighScoreInfo): void {
    this.visible = visible;
    for (const p of this.parts) p.setVisible(visible);
    if (!visible) return;
    this.score.setText(`SCORE ${formatScore(finalScore)}`);
    highScoreLine(this.high, high);
    this.prompt.setVisible(Math.floor(t * GAME_OVER.blinkHz * 2) % 2 === 0);
  }

  /** What is on screen, for the e2e test hook. */
  read(): { visible: boolean; title: string; score: string; high: string; prompt: string } {
    return {
      visible: this.visible,
      title: this.title.text,
      score: this.score.text,
      high: this.high.text,
      prompt: this.prompt.text,
    };
  }
}
