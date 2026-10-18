import Phaser from 'phaser';
import { CONTROLS, DEPTH, GAME_HEIGHT, GAME_OVER, GAME_WIDTH, HUD } from '../config/tuning';
import type { ControlState } from '../logic/controls';

type Part = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text;

/**
 * Draws the pause screen ("PAUSED" + legend), the quit question, and the
 * controls legend on its own. One of these at most is on screen.
 */
export class ControlsOverlay {
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly legend: Phaser.GameObjects.Text[] = [];
  private shown: 'none' | 'legend' | 'paused' | 'confirmQuit' = 'none';
  /** The legend rows are for touch (drag, hold, pause button) rather than keys. */
  private touch = false;

  constructor(scene: Phaser.Scene) {
    const cx = GAME_WIDTH / 2;
    const text = (x: number, y: number, size: number, color: string): Phaser.GameObjects.Text =>
      scene.add
        .text(x, y, '', { fontFamily: HUD.font, fontSize: `${size}px`, color })
        .setShadow(1, 1, HUD.shadow, 0, false, true)
        .setDepth(DEPTH.hud + 3);
    this.backdrop = scene.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH - 8, 10, GAME_OVER.backdrop.color, 0.85)
      .setDepth(DEPTH.hud + 2);
    this.title = text(cx, 0, 16, GAME_OVER.titleColor).setOrigin(0.5);
    this.hint = text(cx, 0, HUD.fontSize, HUD.color).setOrigin(0.5);
    // Two columns: key on the left, action on the right.
    for (const [key, action] of CONTROLS.legend) {
      const left = text(28, 0, HUD.fontSize, '#2de2e6').setText(key);
      const right = text(GAME_WIDTH - 28, 0, HUD.fontSize, HUD.color)
        .setOrigin(1, 0)
        .setText(action);
      this.legend.push(left, right);
    }
    this.hideAll();
  }

  /**
   * Shows whatever the control state calls for. With `touch`, the legend
   * explains the touch controls, and the pause screen and quit question are
   * just headings over the touch menu's buttons (TouchMenu).
   */
  show(s: ControlState, touch = false): void {
    const want =
      s.mode === 'confirmQuit'
        ? 'confirmQuit'
        : s.mode === 'paused'
          ? 'paused'
          : s.legend
            ? 'legend'
            : 'none';
    if (want === this.shown && touch === this.touch) return;
    this.shown = want;
    this.touch = touch;
    this.hideAll();
    if (want === 'none') return;
    if (touch && want !== 'legend') {
      this.heading(want === 'confirmQuit' ? 'QUIT TO ARCADE?' : 'PAUSED');
      return;
    }
    if (want === 'confirmQuit') {
      this.layout(['QUIT TO ARCADE?', 'Y / N'], false);
      return;
    }
    this.layout(want === 'paused' ? ['PAUSED', 'P TO RESUME'] : null, true);
  }

  /** What is on screen, for the e2e test hook. */
  read(): { shown: string; title: string; hint: string; legend: string[] } {
    const pairs: string[] = [];
    for (let i = 0; i < this.legend.length; i += 2) {
      if (this.legend[i]?.visible)
        pairs.push(`${this.legend[i]?.text ?? ''} ${this.legend[i + 1]?.text ?? ''}`);
    }
    return {
      shown: this.shown,
      title: this.title.visible ? this.title.text : '',
      hint: this.hint.visible ? this.hint.text : '',
      legend: this.legend[0]?.visible ? pairs : [],
    };
  }

  /** Stacks the title, the legend rows and the hint in the middle of the screen. */
  private layout(heading: [string, string] | null, withLegend: boolean): void {
    const table = this.touch ? CONTROLS.touchLegend : CONTROLS.legend;
    table.forEach(([key, action], i) => {
      this.legend[2 * i]?.setText(key);
      this.legend[2 * i + 1]?.setText(action);
    });
    const rows = withLegend ? table.length : 0;
    const height = (heading ? 40 : 8) + rows * 12 + (heading ? 18 : 0);
    let y = GAME_HEIGHT / 2 - height / 2 + 10;
    // A lighter backing for the legend alone, which shows over live play at the start.
    this.backdrop
      .setSize(GAME_WIDTH - 8, height + 8)
      .setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setFillStyle(GAME_OVER.backdrop.color, heading ? 0.85 : 0.55)
      .setVisible(true);
    if (heading) {
      this.title
        .setText(heading[0])
        .setY(y + 4)
        .setVisible(true);
      y += 26;
    }
    if (withLegend) {
      for (let i = 0; i < 2 * rows; i += 2) {
        this.legend[i]?.setY(y).setVisible(true);
        this.legend[i + 1]?.setY(y).setVisible(true);
        y += 12;
      }
    }
    if (heading)
      this.hint
        .setText(heading[1])
        .setY(y + 8)
        .setVisible(true);
  }

  /** A heading over a dimmed screen, above the touch menu's buttons. */
  private heading(title: string): void {
    this.backdrop
      .setSize(GAME_WIDTH, GAME_HEIGHT)
      .setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setFillStyle(GAME_OVER.backdrop.color, 0.85)
      .setVisible(true);
    this.title.setText(title).setY(CONTROLS.touchHeadingY).setVisible(true);
  }

  private hideAll(): void {
    const parts: Part[] = [this.backdrop, this.title, this.hint, ...this.legend];
    for (const p of parts) p.setVisible(false);
  }
}
