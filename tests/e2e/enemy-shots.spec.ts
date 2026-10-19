import { expect, test, type Page } from '@playwright/test';
import { GAME_WIDTH } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

/** Near the right edge: the ship's centre stops 26 px from it (x = 230). */
const PARKED_X = GAME_WIDTH - 32;

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openQuietGame(page: Page): Promise<void> {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  await page.evaluate(() => {
    window.__starDestroyer?.setSpawning(false);
    window.__starDestroyer?.clearEnemies();
  });
}

test('an enemy shoots at the ship, and a shot costs one hit', async ({ page }) => {
  await openQuietGame(page);
  const { player } = await snapshot(page);
  // High up, straight above the ship, firing almost at once.
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, 40, 0.1), player.x);

  await expect.poll(async () => (await snapshot(page)).enemyShots.length).toBeGreaterThan(0);
  const hit = await page.waitForFunction(
    () => {
      const s = window.__starDestroyer?.snapshot();
      return s && s.health.hits > 0 ? s : null;
    },
    null,
    { polling: 'raf', timeout: 20_000 },
  );
  const after = (await hit.jsonValue()) as GameSnapshot;
  expect(after.lastHit).toBe('hit');
  // The enemy is still flying: the hit came from its shot, not a crash.
  expect(after.enemies).toHaveLength(1);
  expect(after.enemies[0]?.y).toBeLessThan(player.y - 60);
});

test('enemies hold fire until they are fully on screen', async ({ page }) => {
  await openQuietGame(page);
  const { player } = await snapshot(page);
  // Half on screen (centre at the top edge), first shot due almost at once.
  // A shot fired now would start on screen and be seen, so firing early can't hide.
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, 0, 0.05), player.x + 40);
  const sample = await page.waitForFunction(
    () => {
      const s = window.__starDestroyer?.snapshot();
      const e = s?.enemies[0];
      // Still partly above the screen (its 48 px sprite reaches y < 0).
      return s && e && e.y >= 18 && e.y < 24 ? s : null;
    },
    null,
    { polling: 'raf', timeout: 20_000 },
  );
  expect(((await sample.jsonValue()) as GameSnapshot).enemyShots).toEqual([]);
  // Once fully on screen, it fires.
  await expect.poll(async () => (await snapshot(page)).enemyShots.length).toBeGreaterThan(0);
});

test('missed shots fly off the screen and are removed', async ({ page }) => {
  await openQuietGame(page);
  // Park the ship against the right edge, out of reach of a shooter on the far
  // left. Hold the key until it gets there, not for a fixed time: a slow,
  // loaded browser moves it less per second.
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(async () => (await snapshot(page)).player.x, { timeout: 20_000 })
    .toBeGreaterThanOrEqual(PARKED_X);
  await page.keyboard.up('ArrowRight');
  await page.evaluate(() => window.__starDestroyer?.spawnEnemy(24, 40, 0.1));
  await expect.poll(async () => (await snapshot(page)).enemyShots.length).toBeGreaterThan(0);

  // Remove the shooter but leave its shot in flight: it must leave the screen and be freed.
  await page.evaluate(() => window.__starDestroyer?.clearEnemies(true));
  expect((await snapshot(page)).enemyShots.length).toBeGreaterThan(0);
  await expect
    .poll(async () => (await snapshot(page)).enemyShots.length, { timeout: 20_000 })
    .toBe(0);
  expect((await snapshot(page)).health.hits).toBe(0);
});
