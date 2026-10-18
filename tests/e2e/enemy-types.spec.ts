import { expect, test, type Page } from '@playwright/test';
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

const NEVER = 999; // first shot so late it never happens during the test

test('a weaver sways side to side as it descends', async ({ page }) => {
  await openQuietGame(page);
  await page.evaluate((n) => window.__starDestroyer?.spawnEnemy(128, 40, n, 'weaver'), NEVER);
  // Sample until it has swayed most of the way both sides. Game time follows the
  // frames, so on a busy machine one sway takes longer than its 2.4 s.
  const xs: number[] = [];
  await expect
    .poll(
      async () => {
        const e = (await snapshot(page)).enemies[0];
        if (e) xs.push(e.x);
        return Math.max(...xs) - Math.min(...xs);
      },
      { timeout: 20_000, intervals: [100] },
    )
    .toBeGreaterThan(50); // amplitude 36 each way
  expect(Math.max(...xs)).toBeLessThanOrEqual(128 + 36 + 0.5);
  expect(Math.min(...xs)).toBeGreaterThanOrEqual(128 - 36 - 0.5);
});

test('a diver takes 4 hits and is worth 200 points', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(
    (x) => window.__starDestroyer?.spawnEnemy(x, undefined, undefined, 'diver'),
    player.x,
  );
  await page.keyboard.down('Space');
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 20_000 }).toBe(200);
  await page.keyboard.up('Space');
  expect((await snapshot(page)).enemies).toEqual([]);
});

test('a diver dives into a ship that stays still', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(
    (x) => window.__starDestroyer?.spawnEnemy(x + 30, undefined, undefined, 'diver'),
    player.x,
  );
  await expect.poll(async () => (await snapshot(page)).health.hits, { timeout: 20_000 }).toBe(1);
  const after = await snapshot(page);
  expect(after.lastHit).toBe('hit');
  expect(after.enemies).toEqual([]); // it crashed
  expect(after.enemyShots).toEqual([]); // divers never shoot
});

test('a moving ship can dodge a diver, which flies on off the screen', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(
    (x) => window.__starDestroyer?.spawnEnemy(x, undefined, undefined, 'diver'),
    player.x,
  );
  // Wait for the dive to start (it hovers at y 70, then drops fast), then sidestep.
  await page.waitForFunction(
    () => (window.__starDestroyer?.snapshot()?.enemies[0]?.y ?? 0) > 80,
    null,
    { polling: 'raf', timeout: 20_000 },
  );
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await snapshot(page)).enemies.length, { timeout: 20_000 }).toBe(0);
  await page.keyboard.up('ArrowRight');
  expect((await snapshot(page)).health.hits).toBe(0);
});
