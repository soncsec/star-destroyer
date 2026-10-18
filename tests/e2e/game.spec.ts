import { expect, test, type Page } from '@playwright/test';
import type { GameSnapshot } from '../../src/scenes/GameScene';

/** Records console errors, uncaught exceptions and requests to other hosts. */
function watchPage(page: Page): { errors: string[]; foreignRequests: string[] } {
  const errors: string[] = [];
  const foreignRequests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith('http') && url.hostname !== '127.0.0.1') {
      foreignRequests.push(req.url());
    }
  });
  return { errors, foreignRequests };
}

async function sceneKey(page: Page): Promise<string | null> {
  return page.evaluate(() => window.__starDestroyer?.scene() ?? null);
}

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/** Opens the game and waits for the Game scene to be running. */
async function openGame(page: Page, query = ''): Promise<void> {
  await page.goto(`./${query}`);
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Game');
}

test('boots into the game with no console errors and no third-party requests', async ({ page }) => {
  const watched = watchPage(page);
  await openGame(page);
  await expect(page.locator('#game canvas')).toBeVisible();

  // Let it run for a while so spawning, scrolling and animations all tick.
  const first = await snapshot(page);
  await expect.poll(async () => (await snapshot(page)).enemies.length).toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  expect((await snapshot(page)).player).toEqual(first.player);

  expect(watched.errors).toEqual([]);
  expect(watched.foreignRequests).toEqual([]);
});

test('asset preview scene loads with no console errors', async ({ page }) => {
  const watched = watchPage(page);
  await page.goto('./?scene=preview');
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('AssetPreview');
  await page.waitForTimeout(1000);
  expect(watched.errors).toEqual([]);
});

test('arrow keys move the ship and it stays on screen', async ({ page }) => {
  await openGame(page);
  const start = (await snapshot(page)).player;

  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await snapshot(page)).player.x).toBeLessThan(start.x - 20);
  await page.waitForTimeout(2500); // long enough to reach the left edge
  await page.keyboard.up('ArrowLeft');
  const left = (await snapshot(page)).player;
  expect(left.x).toBeGreaterThan(0);
  expect(left.y).toBe(start.y);

  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await snapshot(page)).player.y).toBeLessThan(start.y - 20);
  await page.keyboard.up('ArrowUp');
});

test('an enemy takes 3 hits, explodes and scores 100', async ({ page }) => {
  const watched = watchPage(page);
  await openGame(page);
  await page.evaluate(() => {
    const hook = window.__starDestroyer;
    if (!hook) throw new Error('test hook missing');
    hook.setSpawning(false);
    hook.clearEnemies();
  });
  const { player } = await snapshot(page);
  expect((await snapshot(page)).score).toBe(0);

  // Put one enemy directly above the ship.
  expect(await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x), player.x)).toBe(true);

  /** Taps Space for exactly one shot, then waits until that shot has hit something. */
  const fireOneShot = async (): Promise<GameSnapshot> => {
    // Exactly one shot via the test hook: holding Space for "one shot" depends on
    // timing, and under load a slow round trip lets the 0.2 s cooldown fire extra shots.
    expect(await page.evaluate(() => window.__starDestroyer?.fireShot())).toBe(true);
    const handle = await page.waitForFunction(
      () => {
        const s = window.__starDestroyer?.snapshot();
        return s && s.shots === 0 ? s : null;
      },
      null,
      { polling: 'raf', timeout: 20_000 },
    );
    return (await handle.jsonValue()) as GameSnapshot;
  };

  // The first two hits only damage it.
  expect((await fireOneShot()).enemies.map((e) => e.hp)).toEqual([2]);
  expect((await fireOneShot()).enemies.map((e) => e.hp)).toEqual([1]);
  // The third destroys it, with an explosion and 100 points.
  const after = await fireOneShot();
  expect(after.enemies).toEqual([]);
  expect(after.score).toBe(100);
  expect(after.explosions).toBeGreaterThan(0);
  expect(watched.errors).toEqual([]);
});

test('the same ?seed= gives the same enemy fire timing', async ({ page }) => {
  // Spawns are scripted (level waves), so the seed now decides when enemies
  // fire. The first enemy's first-shot timer is the first number it draws.
  const firstShot = async (seed: number): Promise<number> => {
    await openGame(page, `?seed=${seed}`);
    await expect.poll(async () => (await snapshot(page)).enemies.length).toBeGreaterThan(0);
    const e = (await snapshot(page)).enemies[0];
    if (!e) throw new Error('no enemy spawned');
    return e.fireIn; // still unchanged: enemies start above the screen
  };
  const a = await firstShot(123);
  const b = await firstShot(123);
  const c = await firstShot(456);
  expect(b).toBe(a);
  expect(c).not.toBe(a);
});
