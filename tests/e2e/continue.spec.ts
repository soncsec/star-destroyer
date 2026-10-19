import { expect, test, type Page } from '@playwright/test';
import { PLAYER_HEALTH } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/** Opens level `level` (the ?level= skip) with no spawns, then crashes the last life away. */
async function dieOnLevel(page: Page, level: number): Promise<GameSnapshot> {
  await page.goto(`./?level=${level}`);
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  await page.evaluate(() => {
    window.__starDestroyer?.setSpawning(false);
    window.__starDestroyer?.clearEnemies();
    window.__starDestroyer?.setWeaponLevel(3);
    window.__starDestroyer?.oneHitLeft();
  });
  const { player } = await snapshot(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), player);
  await expect
    .poll(async () => (await snapshot(page)).gameOver.visible, { timeout: 20_000 })
    .toBe(true);
  return snapshot(page);
}

test('past level 1, game over offers to continue that level (M7.10)', async ({ page }) => {
  const over = await dieOnLevel(page, 3);
  expect(over.level.number).toBe(3);
  expect(over.gameOver).toMatchObject({
    title: 'GAME OVER',
    score: 'SCORE 000000  LEVEL 3',
    prompt: 'PRESS SPACE TO CONTINUE',
  });

  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).health.gameOver).toBe(false);
  const again = await snapshot(page);
  expect(again.level.number).toBe(3);
  expect(again.score).toBe(0);
  expect(again.hud.lives).toBe(`LIVES ${PLAYER_HEALTH.lives}`);
  expect(again.hud.pips.every(Boolean)).toBe(true);
  expect(again.weaponLevel).toBe(1);
  expect(again.gameOver.visible).toBe(false);
  expect(again.cheats.used).toBe(true); // the ?level= skip made it a cheat run; a continue keeps that
});

test('on level 1 the panel still says play again', async ({ page }) => {
  const over = await dieOnLevel(page, 1);
  expect(over.gameOver).toMatchObject({
    score: 'SCORE 000000',
    prompt: 'PRESS SPACE TO PLAY AGAIN',
  });
});
