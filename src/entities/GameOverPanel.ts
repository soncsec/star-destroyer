import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_OVER, GAME_WIDTH, HUD } from '../config/tuning';
import { formatScore } from '../logic/hud';

/** "GAME OVER", the final score, the level, and a blinking prompt to continue. Hidden until shown. */
export class GameOverPanel {
  private readonly parts: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[];
  private readonly title: Phaser.GameObjects.Text;
  private readonly score: Phaser.GameObjects.Text;
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
      .rectangle(cx, cy, GAME_WIDTH, 88, GAME_OVER.backdrop.color, GAME_OVER.backdrop.alpha)
      .setDepth(DEPTH.hud);
    // 16 px is twice the font's native 8 px, so it stays crisp.
    this.title = text(cy - 24, 16, GAME_OVER.titleColor).setText('GAME OVER');
    this.score = text(cy + 2, HUD.fontSize, HUD.color);
    this.prompt = text(cy + 24, HUD.fontSize, HUD.color);
    this.parts = [backdrop, this.title, this.score, this.prompt];
    this.show(false, 0, 1, 0);
  }

  /**
   * Shows or hides the panel; `t` (seconds shown) drives the prompt's blink.
   * Past level 1 the panel names the level and offers to continue it (M7.10).
   */
  show(visible: boolean, finalScore: number, level: number, t: number): void {
    this.visible = visible;
    for (const p of this.parts) p.setVisible(visible);
    if (!visible) return;
    const score = `SCORE ${formatScore(finalScore)}`;
    this.score.setText(level > 1 ? `${score}  LEVEL ${level}` : score);
    this.prompt.setText(level > 1 ? 'PRESS SPACE TO CONTINUE' : 'PRESS SPACE TO PLAY AGAIN');
    this.prompt.setVisible(Math.floor(t * GAME_OVER.blinkHz * 2) % 2 === 0);
  }

  /** What is on screen, for the e2e test hook. */
  read(): { visible: boolean; title: string; score: string; prompt: string } {
    return {
      visible: this.visible,
      title: this.title.text,
      score: this.score.text,
      prompt: this.prompt.text,
    };
  }
}
