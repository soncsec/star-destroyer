import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, HUD, LEVEL_COMPLETE, VICTORY } from '../config/tuning';
import { formatScore } from '../logic/hud';

/** What the victory screen reports about the finished game. */
export interface VictoryInfo {
  score: number;
  lives: number;
}

/**
 * The victory screen after the last level (M6.6): "VICTORY", the final score
 * and lives left, and a blinking prompt to play again. Hidden until shown.
 */
export class VictoryPanel {
  private readonly parts: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[];
  private readonly title: Phaser.GameObjects.Text;
  private readonly line: Phaser.GameObjects.Text;
  private readonly score: Phaser.GameObjects.Text;
  private readonly lives: Phaser.GameObjects.Text;
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
      .rectangle(
        cx,
        cy,
        GAME_WIDTH,
        144,
        LEVEL_COMPLETE.backdrop.color,
        LEVEL_COMPLETE.backdrop.alpha,
      )
      .setDepth(DEPTH.hud);
    // 16 px is twice the font's native 8 px, so it stays crisp.
    this.title = text(cy - 48, 16, VICTORY.titleColor).setText('VICTORY');
    this.line = text(cy - 22, HUD.fontSize, LEVEL_COMPLETE.titleColor).setText(VICTORY.line);
    this.score = text(cy + 2, HUD.fontSize, HUD.color);
    this.lives = text(cy + 18, HUD.fontSize, HUD.color);
    this.prompt = text(cy + 46, HUD.fontSize, HUD.color).setText('PRESS SPACE TO PLAY AGAIN');
    this.parts = [backdrop, this.title, this.line, this.score, this.lives, this.prompt];
    this.hide();
  }

  /** Shows the panel; `t` (seconds shown) drives the prompt's blink. */
  show(info: VictoryInfo, t: number): void {
    this.visible = true;
    for (const p of this.parts) p.setVisible(true);
    this.score.setText(`FINAL SCORE ${formatScore(info.score)}`);
    this.lives.setText(`LIVES LEFT ${info.lives}`);
    this.prompt.setVisible(Math.floor(t * LEVEL_COMPLETE.blinkHz * 2) % 2 === 0);
  }

  hide(): void {
    this.visible = false;
    for (const p of this.parts) p.setVisible(false);
  }

  /** What is on screen, for the e2e test hook. */
  read(): { visible: boolean; title: string; line: string; score: string; lives: string } {
    return {
      visible: this.visible,
      title: this.title.text,
      line: this.line.text,
      score: this.score.text,
      lives: this.lives.text,
    };
  }
}
