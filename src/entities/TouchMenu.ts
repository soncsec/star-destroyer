import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, HUD, TOUCH } from '../config/tuning';
import type { Mode } from '../logic/controls';
import type { Vec } from '../logic/enemyFire';
import { buttonAt, touchButtons, type TouchButton, type TouchContext } from '../logic/touchMenu';

/** Most buttons on screen at once (the pause menu). */
const MAX_BUTTONS = 4;

/**
 * Draws the touchscreen buttons (owner request 2026-10-18): the pause button
 * while playing, and the pause menu or the quit question. Shown only once the
 * player has touched the screen; layout and hit tests are in logic/touchMenu.ts.
 */
export class TouchMenu {
  private readonly boxes: Phaser.GameObjects.Rectangle[] = [];
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private buttons: TouchButton[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    for (let i = 0; i < MAX_BUTTONS; i++) {
      this.boxes.push(
        scene.add
          .rectangle(0, 0, 1, 1, TOUCH.buttonColor, TOUCH.buttonAlpha)
          .setStrokeStyle(1, 0x2de2e6)
          .setDepth(DEPTH.hud + 4)
          .setVisible(false),
      );
      this.labels.push(
        scene.add
          .text(0, 0, '', {
            fontFamily: HUD.font,
            fontSize: `${HUD.fontSize}px`,
            color: TOUCH.labelColor,
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.hud + 5)
          .setVisible(false),
      );
    }
  }

  /** Shows the buttons for this state; hidden entirely unless `enabled` (the screen has been touched). */
  show(enabled: boolean, mode: Mode, ctx: Omit<TouchContext, 'fullscreen'>): void {
    const full = { ...ctx, fullscreen: this.scene.scale.fullscreen.available };
    this.buttons = enabled
      ? touchButtons(mode, full, { screen: { w: GAME_WIDTH, h: GAME_HEIGHT }, ...TOUCH })
      : [];
    this.boxes.forEach((box, i) => {
      const b = this.buttons[i];
      const label = this.labels[i];
      box.setVisible(b !== undefined);
      label?.setVisible(b !== undefined);
      if (!b) return;
      box.setPosition(b.box.x, b.box.y).setSize(b.box.w, b.box.h);
      box.setDisplayOrigin(b.box.w / 2, b.box.h / 2);
      label?.setPosition(b.box.x, b.box.y).setText(b.label);
    });
  }

  /** The button under a finger, if any. */
  at(point: Vec): TouchButton | null {
    return buttonAt(this.buttons, point);
  }

  /** What is on screen, for the e2e test hook. */
  read(): { action: string; label: string; x: number; y: number }[] {
    return this.buttons.map((b) => ({ action: b.action, label: b.label, x: b.box.x, y: b.box.y }));
  }
}
