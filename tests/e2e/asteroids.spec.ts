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

/** Taps Space for exactly one shot and waits until it has hit something or left. */
async function fireOneShot(page: Page): Promise<GameSnapshot> {
  await page.keyboard.down('Space');
  await page.waitForFunction(() => (window.__starDestroyer?.snapshot()?.shots ?? 0) > 0, null, {
    polling: 'raf',
  });
  await page.keyboard.up('Space');
  const handle = await page.waitForFunction(
    () => {
      const s = window.__starDestroyer?.snapshot();
      return s && s.shots === 0 ? s : null;
    },
    null,
    { polling: 'raf', timeout: 5_000 },
  );
  return (await handle.jsonValue()) as GameSnapshot;
}

test('a large asteroid takes 6 hits, scores 50 and splits into 3 small rocks', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate((x) => window.__starDestroyer?.spawnAsteroid(x, 90), player.x);

  for (let hp = 5; hp >= 1; hp--) {
    const s = await fireOneShot(page);
    expect(s.asteroids.map((r) => [r.size, r.hp])).toEqual([['large', hp]]);
  }
  const split = await fireOneShot(page);
  expect(split.score).toBe(50);
  expect(split.asteroids).toHaveLength(3);
  expect(split.asteroids.every((r) => r.size === 'small' && r.hp === 1)).toBe(true);
  expect(split.explosions).toBeGreaterThan(0);
});

test('small rocks take one hit each and score 25', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate((x) => window.__starDestroyer?.spawnAsteroid(x, 90), player.x);
  await page.keyboard.down('Space');
  // The large rock (50) and then at least one piece (25 each).
  await expect
    .poll(async () => (await snapshot(page)).score, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(75);
  await page.keyboard.up('Space');
  expect((await snapshot(page)).score % 25).toBe(0);
});

test('crashing into a large asteroid costs a hit and still splits it', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnAsteroid(x, y), player);
  const handle = await page.waitForFunction(
    () => {
      const s = window.__starDestroyer?.snapshot();
      return s && s.health.hits > 0 ? s : null;
    },
    null,
    { polling: 'raf', timeout: 5_000 },
  );
  const after = (await handle.jsonValue()) as GameSnapshot;
  expect(after.lastHit).toBe('hit');
  expect(after.score).toBe(0); // no points for crashing
  expect(after.asteroids.filter((r) => r.size === 'small')).toHaveLength(3);
  expect(after.asteroids.some((r) => r.size === 'large')).toBe(false);
});
