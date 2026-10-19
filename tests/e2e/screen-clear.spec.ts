import { expect, test, type Page } from '@playwright/test';
import { ENEMY_TYPES } from '../../src/config/tuning';
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

async function collectClear(page: Page): Promise<GameSnapshot> {
  const before = await snapshot(page);
  await page.evaluate(
    ({ x, y }) => window.__starDestroyer?.spawnPickup('clear', x, y),
    before.player,
  );
  await expect.poll(async () => (await snapshot(page)).collected.clear).toBe(1);
  return snapshot(page);
}

test('a pink gem destroys every enemy and enemy shot on screen, scoring each kill', async ({
  page,
}) => {
  await openQuietGame(page);
  // Two shooters and a weaver, all on screen; the shooters fire straight away.
  await page.evaluate(() => {
    const h = window.__starDestroyer;
    h?.spawnEnemy(40, 60, 0.05, 'grunt');
    h?.spawnEnemy(216, 60, 0.05, 'grunt');
    h?.spawnEnemy(128, 110, 999, 'weaver');
  });
  await expect.poll(async () => (await snapshot(page)).enemyShots.length).toBeGreaterThan(1);
  const before = await snapshot(page);
  expect(before.enemies).toHaveLength(3);

  const after = await collectClear(page);
  expect(after.enemies).toHaveLength(0);
  expect(after.enemyShots).toHaveLength(0);
  expect(after.score).toBe(before.score + 2 * ENEMY_TYPES.grunt.points + ENEMY_TYPES.weaver.points);
  expect(after.explosions).toBeGreaterThanOrEqual(3);
  expect(after.blasts).toBe(before.blasts + 1);
});

test('enemies still above the screen, and asteroids, survive a screen clear', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate((x) => {
    const h = window.__starDestroyer;
    h?.spawnEnemy(x, 60, 999, 'grunt'); // on screen: destroyed
    h?.spawnEnemy(x, -80, 999, 'grunt'); // not on screen yet: survives
    h?.spawnAsteroid(60, 120); // not an enemy: left alone
  }, player.x);
  await expect.poll(async () => (await snapshot(page)).enemies.length).toBe(2);

  const after = await collectClear(page);
  expect(after.enemies).toHaveLength(1);
  expect(after.enemies[0]?.y).toBeLessThan(0);
  expect(after.asteroids).toHaveLength(1);
  expect(after.score).toBe(ENEMY_TYPES.grunt.points);
});
