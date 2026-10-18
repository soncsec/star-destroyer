import { expect, test, type Page } from '@playwright/test';
import { ASTEROIDS, ENEMY_TYPES } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openQuietGame(page: Page): Promise<GameSnapshot> {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  await page.evaluate(() => {
    window.__starDestroyer?.setSpawning(false);
    window.__starDestroyer?.clearEnemies();
  });
  return snapshot(page);
}

test('a shot that hits an enemy without destroying it still sparks', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, 80, 999, 'grunt'), player.x);
  await page.evaluate(() => window.__starDestroyer?.fireShot());
  await expect
    .poll(async () => (await snapshot(page)).enemies[0]?.hp)
    .toBe(ENEMY_TYPES.grunt.hp - 1);
  const s = await snapshot(page);
  expect(s.sparks).toBe(1);
  expect(s.explosions).toBe(0); // still alive: a spark, not an explosion
});

test('a shot that hits an asteroid sparks', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate((x) => window.__starDestroyer?.spawnAsteroid(x, 80), player.x);
  await page.evaluate(() => window.__starDestroyer?.fireShot());
  await expect.poll(async () => (await snapshot(page)).sparks).toBe(1);
  expect((await snapshot(page)).asteroids[0]?.hp).toBeLessThan(ASTEROIDS.large.hp);
});

test('an enemy shot that hits the ship sparks', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, 40, 0.05), player.x);
  await expect.poll(async () => (await snapshot(page)).health.hits, { timeout: 20_000 }).toBe(1);
  expect((await snapshot(page)).sparks).toBe(1);
});

test('an enemy shot absorbed by the shield sparks', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(() => window.__starDestroyer?.setShield(30));
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, 40, 0.05), player.x);
  await expect.poll(async () => (await snapshot(page)).sparks, { timeout: 20_000 }).toBe(1);
  expect((await snapshot(page)).health.hits).toBe(0);
});
