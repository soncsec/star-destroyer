import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/tuning';

/** Placeholder first scene; later tasks replace it with Preload and Game scenes. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'STAR DESTROYER', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#4fd3d6',
      })
      .setOrigin(0.5);
  }
}
