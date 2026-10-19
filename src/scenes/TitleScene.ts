import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { CONTROLS, GAME_HEIGHT, GAME_WIDTH, HUD, PLAYER, TITLE } from '../config/tuning';

/**
 * The title screen (M7.1): the game's name over the drifting nebula, the
 * ship, and how to start or go back to the arcade. Space or Enter starts a
 * game; Q goes back to the arcade portal (nothing to lose here, so no
 * question first); F toggles full screen.
 */
export class TitleScene extends Phaser.Scene {
  private layers: { sprite: Phaser.GameObjects.TileSprite; speed: number }[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private t = 0;

  constructor() {
    super('Title');
  }

  create(): void {
    this.t = 0;
    this.layers = TITLE.backdrop.map((l) => ({
      sprite: this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, l.texture)
        .setOrigin(0)
        .setAlpha(l.alpha),
      speed: l.scrollSpeed,
    }));
    const cx = GAME_WIDTH / 2;
    const text = (y: number, size: number, color: string, s: string): Phaser.GameObjects.Text =>
      this.add
        .text(cx, y, s, { fontFamily: HUD.font, fontSize: `${size}px`, color })
        .setOrigin(0.5)
        .setShadow(1, 1, HUD.shadow, 0, false, true);
    // 24 px is three times the font's native 8 px, so it stays crisp.
    text(TITLE.y.name, 24, TITLE.nameColor, 'STAR');
    text(TITLE.y.name + 30, 24, TITLE.nameColor, 'DESTROYER');
    // The ship, level, with its flame placed as in play (Player.ts).
    const ship = this.add.sprite(cx, TITLE.y.ship, PLAYER.ship, PLAYER.bankFrames[2]).setDepth(1);
    const flame = this.add.sprite(cx, 0, PLAYER.thrust).play(animKey(PLAYER.thrust));
    flame.setY(TITLE.y.ship + ship.height / 2 + flame.height / 2 - PLAYER.thrustOverlap);
    this.prompt = text(TITLE.y.prompt, HUD.fontSize, HUD.color, 'PRESS SPACE TO START');
    text(TITLE.y.keys, HUD.fontSize, TITLE.keysColor, 'Q  BACK TO ARCADE');
    text(TITLE.y.keys + 14, HUD.fontSize, TITLE.keysColor, 'F  FULL SCREEN');

    // The browser's own keydown, once per press (see GameScene).
    const actions: Record<string, () => void> = {
      Space: () => this.scene.start('Game'),
      Enter: () => this.scene.start('Game'),
      NumpadEnter: () => this.scene.start('Game'),
      KeyQ: () => window.location.assign(new URL(CONTROLS.quitUrl, window.location.href).href),
      KeyF: () => this.scale.toggleFullscreen(),
    };
    const onKey = (e: KeyboardEvent): void => {
      if (!e.repeat) actions[e.code]?.();
    };
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', onKey),
    );
  }

  override update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    for (const l of this.layers) l.sprite.tilePositionY -= l.speed * dt;
    this.prompt.setVisible(Math.floor(this.t * TITLE.blinkHz * 2) % 2 === 0);
  }
}
