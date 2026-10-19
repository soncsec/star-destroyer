import Phaser from 'phaser';
import { ASSETS, animKey } from '../assets/manifest';

/** Loads every asset in the manifest and registers each sheet's default animation. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    for (const asset of ASSETS) {
      if (asset.kind === 'sheet') {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        });
      } else {
        this.load.image(asset.key, asset.path);
      }
    }
  }

  create(): void {
    for (const asset of ASSETS) {
      if (asset.kind !== 'sheet' || asset.frameRate === 0) continue;
      this.anims.create({
        key: animKey(asset.key),
        frames: this.anims.generateFrameNumbers(asset.key, { start: 0, end: asset.frames - 1 }),
        frameRate: asset.frameRate,
        repeat: asset.loop ? -1 : 0,
        repeatDelay: asset.loop ? 0 : 400,
      });
    }
    const params = new URLSearchParams(window.location.search);
    // Players start at the title screen. The e2e build goes straight to the
    // game so each test starts playing at once, unless it asks for the title
    // (?title); Vite fixes MODE at build time.
    const first = import.meta.env.MODE === 'e2e' && !params.has('title') ? 'Game' : 'Title';
    // ?scene=preview opens the asset preview, a developer tool that isn't in the
    // production build: there this is decided at build time and is just `first`.
    const preview = import.meta.env.MODE !== 'production' && params.get('scene') === 'preview';
    this.scene.start(preview ? 'AssetPreview' : first);
  }
}
