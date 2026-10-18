import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, HUD, LEVEL_COMPLETE } from '../config/tuning';
import { formatScore } from '../logic/hud';
import { pressPrompt } from '../platform/touch';

/** What the panel says about the level just finished and the one coming next. */
export interface LevelCompleteInfo {
  number: number;
  name: string;
  score: number;
  /** The next level, or null after the last one. */
  next: { number: number; name: string } | null;
}

/** "LEVEL n COMPLETE", the score, what comes next and a blinking prompt. Hidden until shown. */
export class LevelCompletePanel {
  private readonly parts: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[];
  private readonly title: Phaser.GameObjects.Text;
  private readonly title2: Phaser.GameObjects.Text;
  private readonly name: Phaser.GameObjects.Text;
  private readonly score: Phaser.GameObjects.Text;
  private readonly next: Phaser.GameObjects.Text;
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
        128,
        LEVEL_COMPLETE.backdrop.color,
        LEVEL_COMPLETE.backdrop.alpha,
      )
      .setDepth(DEPTH.hud);
    // 16 px is twice the font's native 8 px, so it stays crisp. "LEVEL n COMPLETE"
    // on one line would fill the whole width, so it takes two.
    this.title = text(cy - 50, 16, LEVEL_COMPLETE.titleColor);
    this.title2 = text(cy - 30, 16, LEVEL_COMPLETE.titleColor).setText('COMPLETE');
    this.name = text(cy - 8, HUD.fontSize, HUD.color);
    this.score = text(cy + 8, HUD.fontSize, HUD.color);
    this.next = text(cy + 26, HUD.fontSize, LEVEL_COMPLETE.titleColor);
    this.prompt = text(cy + 48, HUD.fontSize, HUD.color).setText(pressPrompt('CONTINUE'));
    this.parts = [backdrop, this.title, this.title2, this.name, this.score, this.next, this.prompt];
    this.hide();
  }

  /** Shows the panel; `t` (seconds shown) drives the prompt's blink. */
  show(info: LevelCompleteInfo, t: number): void {
    this.visible = true;
    for (const p of this.parts) p.setVisible(true);
    this.title.setText(`LEVEL ${info.number}`);
    this.name.setText(info.name.toUpperCase());
    this.score.setText(`SCORE ${formatScore(info.score)}`);
    this.next.setText(info.next ? `NEXT: LEVEL ${info.next.number}` : 'ALL LEVELS COMPLETE');
    this.prompt.setVisible(Math.floor(t * LEVEL_COMPLETE.blinkHz * 2) % 2 === 0);
  }

  hide(): void {
    this.visible = false;
    for (const p of this.parts) p.setVisible(false);
  }

  /** What is on screen, for the e2e test hook. */
  read(): { visible: boolean; title: string; name: string; score: string; next: string } {
    return {
      visible: this.visible,
      title: `${this.title.text} ${this.title2.text}`,
      name: this.name.text,
      score: this.score.text,
      next: this.next.text,
    };
  }
}
