import Phaser from 'phaser';
import { BACKGROUND, GAME_HEIGHT, GAME_WIDTH } from '../config/tuning';

export class GameScene extends Phaser.Scene {
  private nebula!: Phaser.GameObjects.TileSprite;
  private stars!: Phaser.GameObjects.TileSprite;

  constructor() {
    super('Game');
  }

  create(): void {
    this.nebula = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-stage-back').setOrigin(0);
    this.stars = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-blue-stars')
      .setOrigin(0)
      .setAlpha(0.8);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    // Moving the texture down makes the ship appear to fly up.
    this.nebula.tilePositionY -= BACKGROUND.nebulaSpeed * dt;
    this.stars.tilePositionY -= BACKGROUND.starsSpeed * dt;
  }
}
