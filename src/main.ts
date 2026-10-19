import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH, HUD } from './config/tuning';
import { integerZoom } from './logic/scaling';
import { isTouchDevice } from './platform/touch';
import { AssetPreviewScene } from './scenes/AssetPreviewScene';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';

const zoomForWindow = (): number =>
  integerZoom(window.innerWidth, window.innerHeight, GAME_WIDTH, GAME_HEIGHT);

// Canvas text can't wait for a web font, so load the HUD font before the game
// starts. If it fails, the game still runs with a fallback font.
await document.fonts.load(`8px ${HUD.font}`).catch(() => undefined);

const touch = isTouchDevice();

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#05070f',
  pixelArt: true,
  roundPixels: true,
  scale: touch
    ? {
        // Phones and tablets (owner 2026-10-18): fill the screen, even at an
        // in-between zoom, rather than a whole-number zoom that is often 1×
        // on a phone. At that size slightly uneven pixels are hard to see.
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        fullscreenTarget: 'game',
      }
    : {
        // Whole-number zoom keeps pixels crisp; the page's CSS centers the canvas.
        mode: Phaser.Scale.NONE,
        zoom: zoomForWindow(),
        // Full screen the centering #game container itself. Without this, Phaser
        // wraps the canvas in a plain new div, and the game sits top-left.
        fullscreenTarget: 'game',
      },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  // The asset preview (?scene=preview) is a developer tool: it is left out of
  // the production build (owner decision 2026-10-18). Vite replaces MODE at
  // build time, so in production the preview code is dropped from the bundle.
  scene:
    import.meta.env.MODE === 'production'
      ? [PreloadScene, TitleScene, GameScene]
      : [PreloadScene, TitleScene, GameScene, AssetPreviewScene],
});

// FIT mode follows the window by itself; whole-number zoom is redone here.
if (!touch) {
  window.addEventListener('resize', () => {
    const zoom = zoomForWindow();
    if (game.scale.zoom !== zoom) game.scale.setZoom(zoom);
  });
}

// The e2e build adds a test hook. Vite replaces MODE at build time, so this
// branch and the hook module are left out of the normal build entirely.
if (import.meta.env.MODE === 'e2e') {
  void import('./debug/testHook').then(({ installTestHook }) => installTestHook(game));
}
