import Phaser from 'phaser';
import { ASSETS, animKey, type Asset, type AssetGroup } from '../assets/manifest';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/tuning';

const GROUPS: readonly AssetGroup[] = [
  'player',
  'enemies',
  'boss',
  'asteroids',
  'backgrounds',
  'weapons',
  'explosions',
];
const HEADER = 24;
const CELL_LABEL = 9;

/**
 * Developer tool (open the game with ?scene=preview): shows every asset in one group,
 * animated, so frame slicing can be checked by eye. Left/right arrows change the group.
 */
export class AssetPreviewScene extends Phaser.Scene {
  private page = 0;
  private items: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('AssetPreview');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1b2236');
    this.input.keyboard?.on('keydown-RIGHT', () => this.show(this.page + 1));
    this.input.keyboard?.on('keydown-LEFT', () => this.show(this.page - 1));
    this.show(0);
  }

  private show(page: number): void {
    this.page = (page + GROUPS.length) % GROUPS.length;
    const group = GROUPS[this.page] as AssetGroup;
    for (const item of this.items) item.destroy();
    this.items = [];

    const assets = ASSETS.filter((a) => a.group === group);
    this.items.push(
      this.label(
        4,
        4,
        `${group.toUpperCase()}  ${this.page + 1}/${GROUPS.length}  <- ->`,
        '#4fd3d6',
      ),
    );

    const cols = Math.ceil(Math.sqrt(assets.length * (GAME_WIDTH / (GAME_HEIGHT - HEADER))));
    const rows = Math.ceil(assets.length / cols);
    const cellW = GAME_WIDTH / cols;
    const cellH = (GAME_HEIGHT - HEADER) / rows;

    assets.forEach((asset, i) => {
      const x = (i % cols) * cellW;
      const y = HEADER + Math.floor(i / cols) * cellH;
      this.items.push(
        this.sprite(
          asset,
          x + cellW / 2,
          y + (cellH - CELL_LABEL) / 2,
          cellW - 4,
          cellH - CELL_LABEL - 4,
        ),
      );
      // ~5px per character at 8px monospace; trim so labels don't overlap.
      const maxChars = Math.floor((cellW - 2) / 5);
      this.items.push(
        this.label(x + 2, y + cellH - CELL_LABEL, asset.key.slice(0, maxChars), '#c8d0e0'),
      );
    });
  }

  private sprite(asset: Asset, x: number, y: number, maxW: number, maxH: number) {
    const w = asset.kind === 'sheet' ? asset.frameWidth : asset.width;
    const h = asset.kind === 'sheet' ? asset.frameHeight : asset.height;
    // Scale down to fit the cell, never up, so pixels stay crisp where possible.
    const scale = Math.min(1, maxW / w, maxH / h);
    const s = this.add.sprite(x, y, asset.key).setScale(scale);
    if (asset.kind === 'sheet') {
      if (asset.frameRate > 0) s.play(animKey(asset.key));
      else s.setFrame(Math.floor(asset.frames / 2));
    }
    return s;
  }

  private label(x: number, y: number, text: string, color: string) {
    return this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: '8px', color });
  }
}
