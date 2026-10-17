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

test('a pickup drifts down and the ship collects it by touching it', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(
    ({ x, y }) => window.__starDestroyer?.spawnPickup('shield', x, y - 50),
    player,
  );
  expect((await snapshot(page)).pickups.map((p) => p.kind)).toEqual(['shield']);
  await expect
    .poll(async () => (await snapshot(page)).collected.shield, { timeout: 5_000 })
    .toBe(1);
  const after = await snapshot(page);
  expect(after.pickups).toEqual([]);
  expect(after.collected).toEqual({ weapon: 0, shield: 1, clear: 0 });
});

test('a pickup the ship misses falls off the screen uncollected', async ({ page }) => {
  await openQuietGame(page); // the ship sits in the middle
  await page.evaluate(() => window.__starDestroyer?.spawnPickup('weapon', 20, 240));
  await expect.poll(async () => (await snapshot(page)).pickups.length, { timeout: 8_000 }).toBe(0);
  expect((await snapshot(page)).collected.weapon).toBe(0);
});

test('shooting down an enemy can drop a pickup where it died', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(() => window.__starDestroyer?.setDropChance(1)); // every kill drops
  // A grunt straight above the ship: three single shots destroy it.
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, 60, 999), player.x);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__starDestroyer?.fireShot());
    await page.waitForTimeout(150);
  }
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 5_000 }).toBe(100);
  const drop = await snapshot(page);
  expect(drop.pickups).toHaveLength(1);
  expect(Math.abs((drop.pickups[0]?.x ?? 0) - player.x)).toBeLessThan(2);
});
