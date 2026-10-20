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
    .poll(async () => (await snapshot(page)).collected.shield, { timeout: 20_000 })
    .toBe(1);
  const after = await snapshot(page);
  expect(after.pickups).toEqual([]);
  expect(after.collected).toEqual({ weapon: 0, shield: 1, clear: 0, health: 0 });
});

test('a green gem refills every health pip, keeping lives, gun and shield (M7.18)', async ({
  page,
}) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(() => {
    window.__starDestroyer?.setWeaponLevel(2);
    window.__starDestroyer?.oneHitLeft(3); // 4 hits taken: one pip left, 3 lives
  });
  await expect
    .poll(async () => (await snapshot(page)).hud.pips)
    .toEqual([true, false, false, false, false]);
  const before = await snapshot(page);
  await page.evaluate(
    ({ x, y }) => window.__starDestroyer?.spawnPickup('health', x, y - 30),
    player,
  );
  expect((await snapshot(page)).pickups.map((p) => p.kind)).toEqual(['health']);
  await expect
    .poll(async () => (await snapshot(page)).collected.health, { timeout: 20_000 })
    .toBe(1);
  const after = await snapshot(page);
  expect(after.hud.pips).toEqual([true, true, true, true, true]);
  expect(after.hud.lives).toBe(before.hud.lives);
  expect(after.weaponLevel).toBe(2);
  expect(after.sfx.played.healthUp).toBe(1);
  expect(after.collected).toEqual({ weapon: 0, shield: 0, clear: 0, health: 1 });
});

test('a pickup the ship misses falls off the screen uncollected', async ({ page }) => {
  await openQuietGame(page); // the ship sits in the middle
  await page.evaluate(() => window.__starDestroyer?.spawnPickup('weapon', 20, 240));
  await expect.poll(async () => (await snapshot(page)).pickups.length, { timeout: 20_000 }).toBe(0);
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
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 20_000 }).toBe(100);
  const drop = await snapshot(page);
  expect(drop.pickups).toHaveLength(1);
  expect(Math.abs((drop.pickups[0]?.x ?? 0) - player.x)).toBeLessThan(2);
});
