import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/tuning';
import { AssetPreviewScene } from './scenes/AssetPreviewScene';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#05070f',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [PreloadScene, BootScene, AssetPreviewScene],
});
