import { expect, test, type Page } from '@playwright/test';
import { SHIELD } from '../../src/config/tuning';
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

async function collectShield(page: Page): Promise<GameSnapshot> {
  const before = await snapshot(page);
  await page.evaluate(
    ({ x, y }) => window.__starDestroyer?.spawnPickup('shield', x, y),
    before.player,
  );
  await expect
    .poll(async () => (await snapshot(page)).collected.shield)
    .toBe(before.collected.shield + 1);
  return snapshot(page);
}

test('a blue gem gives a 10-second shield, shown around the ship and in the HUD', async ({
  page,
}) => {
  await openQuietGame(page);
  const s = await collectShield(page);
  expect(SHIELD.duration).toBe(10); // owner decision 2026-10-18 (was 30)
  expect(s.shield.timeLeft).toBeGreaterThan(SHIELD.duration - 0.5);
  expect(s.shield.bubbleVisible).toBe(true);
  expect(s.hud.shield).toBe(`SHIELD ${SHIELD.duration}`);
  // Game time follows the frames, which a busy browser runs in bursts, so the
  // count can skip numbers between looks. Wait for it to move, then check the
  // HUD shows the time left, rounded up, in that same frame.
  await expect
    .poll(async () => (await snapshot(page)).hud.shield, { timeout: 5_000 })
    .not.toBe(`SHIELD ${SHIELD.duration}`);
  const later = await snapshot(page);
  expect(later.shield.timeLeft).toBeLessThan(SHIELD.duration);
  expect(later.hud.shield).toBe(`SHIELD ${Math.ceil(later.shield.timeLeft)}`);
});

test('while shielded, crashes and enemy shots do no damage', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await collectShield(page);
  // A rammer on the ship, and a shooter straight above firing at once.
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), player);
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, 40, 0.05), player.x);
  await expect.poll(async () => (await snapshot(page)).enemyShots.length).toBeGreaterThan(0);
  await page.waitForTimeout(2500); // the shot reaches the ship and is absorbed
  const s = await snapshot(page);
  expect(s.health.hits).toBe(0);
  // The rammer was destroyed; only the shooter is left, still above the ship.
  expect(s.enemies).toHaveLength(1);
  expect(s.enemies[0]?.y).toBeLessThan(player.y - 30);
});

test('another blue gem resets the shield to its full 10 seconds', async ({ page }) => {
  await openQuietGame(page);
  await collectShield(page);
  await page.evaluate(() => window.__starDestroyer?.setShield(3));
  expect((await snapshot(page)).shield.timeLeft).toBeLessThanOrEqual(3);
  const s = await collectShield(page);
  expect(s.shield.timeLeft).toBeGreaterThan(SHIELD.duration - 0.5);
});

test('the shield runs out: the bubble goes, the HUD clears, and hits count again', async ({
  page,
}) => {
  const { player } = await openQuietGame(page);
  await collectShield(page);
  await page.evaluate(() => window.__starDestroyer?.setShield(0.5));
  await expect.poll(async () => (await snapshot(page)).shield.timeLeft).toBe(0);
  await expect.poll(async () => (await snapshot(page)).hud.shield).toBe('');
  await expect.poll(async () => (await snapshot(page)).shield.bubbleVisible).toBe(false);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), player);
  await expect.poll(async () => (await snapshot(page)).health.hits).toBe(1);
});

test('pausing freezes the shield timer', async ({ page }) => {
  await openQuietGame(page);
  await collectShield(page);
  await page.keyboard.press('p');
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('paused');
  const at = (await snapshot(page)).shield.timeLeft;
  await page.waitForTimeout(1500);
  expect((await snapshot(page)).shield.timeLeft).toBe(at);
});
