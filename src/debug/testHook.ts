import type Phaser from 'phaser';
import type { GameScene, GameSnapshot } from '../scenes/GameScene';

/**
 * Test-only hook for Playwright (ADR-006). It is loaded only in the e2e build
 * (`vite build --mode e2e`), so the build players get never includes it.
 */
export interface TestHook {
  /** The key of the scene that is running, or null while loading. */
  scene(): string | null;
  snapshot(): GameSnapshot | null;
  setSpawning(on: boolean): void;
  clearEnemies(): void;
  /** Spawns an enemy at x (top of the screen), or at (x, y). */
  spawnEnemy(x: number, y?: number): boolean;
}

declare global {
  interface Window {
    __starDestroyer?: TestHook;
  }
}

export function installTestHook(game: Phaser.Game): void {
  const gameScene = (): GameScene | null => {
    const s = game.scene.getScene('Game') as GameScene | null;
    return s && game.scene.isActive('Game') ? s : null;
  };
  const required = (): GameScene => {
    const s = gameScene();
    if (!s) throw new Error('the Game scene is not running');
    return s;
  };

  window.__starDestroyer = {
    scene: () => game.scene.getScenes(true)[0]?.scene.key ?? null,
    snapshot: () => gameScene()?.snapshot() ?? null,
    setSpawning: (on) => required().setSpawning(on),
    clearEnemies: () => required().clearEnemies(),
    spawnEnemy: (x, y) => required().spawnEnemy(x, y),
  };
}
