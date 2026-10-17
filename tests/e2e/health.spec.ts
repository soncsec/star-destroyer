import { expect, test, type Page } from '@playwright/test';
import type { GameSnapshot } from '../../src/scenes/GameScene';

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/** Opens the game with an empty screen and no random spawns. */
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

/**
 * Waits until the ship can be hurt, puts an enemy right on top of it, and
 * returns the snapshot once that crash has been counted.
 */
async function crash(page: Page): Promise<GameSnapshot> {
  await expect
    .poll(async () => (await snapshot(page)).health.invulnerable, { timeout: 5_000 })
    .toBe(0);
  const before = await snapshot(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y), before.player);
  const handle = await page.waitForFunction(
    (b) => {
      const s = window.__starDestroyer?.snapshot();
      return s && (s.health.hits !== b.hits || s.health.lives !== b.lives) ? s : null;
    },
    before.health,
    { polling: 'raf', timeout: 5_000 },
  );
  return (await handle.jsonValue()) as GameSnapshot;
}

test('crashing into an enemy costs one hit and destroys the enemy', async ({ page }) => {
  await openQuietGame(page);
  expect((await snapshot(page)).health).toMatchObject({ hits: 0, lives: 3, gameOver: false });

  const after = await crash(page);
  expect(after.health).toMatchObject({ hits: 1, lives: 3 });
  expect(after.lastHit).toBe('hit');
  expect(after.enemies).toEqual([]);
  expect(after.explosions).toBeGreaterThan(0);
  // Briefly invulnerable, so the same crash can't count twice.
  expect(after.health.invulnerable).toBeGreaterThan(0);
});

test('the 5th hit costs a life and respawns the ship at the start, invulnerable', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await openQuietGame(page);
  const start = (await snapshot(page)).player;

  // Move away from the start so the respawn is visible in the position.
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await snapshot(page)).player.x).toBeLessThan(start.x - 30);
  await page.keyboard.up('ArrowLeft');

  for (let i = 1; i <= 4; i++) expect((await crash(page)).health.hits).toBe(i);
  const fifth = await crash(page);
  expect(fifth.lastHit).toBe('lifeLost');
  expect(fifth.health).toMatchObject({ hits: 0, lives: 2 });
  expect(fifth.health.invulnerable).toBeGreaterThan(1.5);
  expect(fifth.player).toEqual(start);
});

test('losing all 3 lives ends the game: the ship stops moving and firing', async ({ page }) => {
  test.setTimeout(90_000);
  await openQuietGame(page);
  let last = await snapshot(page);
  for (let i = 0; i < 15; i++) last = await crash(page);
  expect(last.lastHit).toBe('gameOver');
  expect(last.health).toMatchObject({ lives: 0, gameOver: true });

  const frozen = last.player;
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('Space');
  const after = await snapshot(page);
  expect(after.player).toEqual(frozen);
  expect(after.shots).toBe(0);
});
