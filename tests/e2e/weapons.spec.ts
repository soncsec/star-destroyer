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

/** Fires one volley and returns the damage of each shot it put in the air. */
async function volley(page: Page): Promise<number[]> {
  await expect.poll(async () => (await snapshot(page)).shots, { timeout: 5_000 }).toBe(0);
  await page.evaluate(() => window.__starDestroyer?.fireShot());
  return (await snapshot(page)).shotDamage;
}

/** Drops a weapon gem on the ship and waits until it is collected. */
async function collectWeapon(page: Page): Promise<GameSnapshot> {
  const before = await snapshot(page);
  await page.evaluate(
    ({ x, y }) => window.__starDestroyer?.spawnPickup('weapon', x, y),
    before.player,
  );
  await expect
    .poll(async () => (await snapshot(page)).collected.weapon)
    .toBe(before.collected.weapon + 1);
  return snapshot(page);
}

test('the gun starts small: one shot, 1 damage', async ({ page }) => {
  await openQuietGame(page);
  expect((await snapshot(page)).weaponLevel).toBe(1);
  expect(await volley(page)).toEqual([1]);
});

test('each weapon gem upgrades the gun: two shots, then a spread of three at double damage', async ({
  page,
}) => {
  await openQuietGame(page);
  expect((await collectWeapon(page)).weaponLevel).toBe(2);
  expect(await volley(page)).toEqual([1, 1]);
  expect((await collectWeapon(page)).weaponLevel).toBe(3);
  expect(await volley(page)).toEqual([2, 2, 2]);
  // The top level is 3: more gems keep it there.
  expect((await collectWeapon(page)).weaponLevel).toBe(3);
});

test('level 3 destroys a grunt (3 HP) with its first two volleys', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(() => window.__starDestroyer?.setWeaponLevel(3));
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, 60, 999), player.x);
  await volley(page);
  await expect.poll(async () => (await snapshot(page)).enemies[0]?.hp).toBe(1); // 3 - 2
  await volley(page);
  await expect.poll(async () => (await snapshot(page)).score).toBe(100);
});

test('losing a life drops the gun back to level 1 (power-ups are lost on death)', async ({
  page,
}) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(() => window.__starDestroyer?.setWeaponLevel(3));
  await page.evaluate(() => window.__starDestroyer?.oneHitLeft(3));
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), player);
  await expect.poll(async () => (await snapshot(page)).lastHit).toBe('lifeLost');
  const after = await snapshot(page);
  expect(after.health.lives).toBe(2);
  expect(after.weaponLevel).toBe(1);
});

test('a new game starts with the small gun again', async ({ page }) => {
  await openQuietGame(page);
  await collectWeapon(page);
  await page.evaluate(() => window.__starDestroyer?.oneHitLeft());
  const s = await snapshot(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), s.player);
  await expect
    .poll(async () => (await snapshot(page)).gameOver.armed, { timeout: 5_000 })
    .toBe(true);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).health.gameOver).toBe(false);
  expect((await snapshot(page)).weaponLevel).toBe(1);
});
