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

/** Puts an enemy on the ship once it can be hurt, and waits for the hit to count. */
async function crash(page: Page): Promise<GameSnapshot> {
  await expect
    .poll(async () => (await snapshot(page)).health.invulnerable, { timeout: 5_000 })
    .toBe(0);
  const before = await snapshot(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), before.player);
  const h = await page.waitForFunction(
    (b) => {
      const s = window.__starDestroyer?.snapshot();
      return s && (s.health.hits !== b.hits || s.health.lives !== b.lives) ? s : null;
    },
    before.health,
    { polling: 'raf', timeout: 5_000 },
  );
  return (await h.jsonValue()) as GameSnapshot;
}

test('the HUD starts with score 0, 3 lives and 5 health pips, in the pixel font', async ({
  page,
}) => {
  const s = await openQuietGame(page);
  expect(s.hud).toEqual({
    score: 'SCORE 000000',
    lives: 'LIVES 3',
    pips: [true, true, true, true, true],
  });
  expect(await page.evaluate(() => document.fonts.check('8px "Press Start 2P"'))).toBe(true);
});

test('the score on screen follows the points scored', async ({ page }) => {
  const { player } = await openQuietGame(page);
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, undefined, 999), player.x);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 8_000 }).toBe(100);
  await page.keyboard.up('Space');
  await expect.poll(async () => (await snapshot(page)).hud.score).toBe('SCORE 000100');
});

test('pips go out one per hit, and refill with one fewer life after the 5th', async ({ page }) => {
  test.setTimeout(60_000);
  await openQuietGame(page);
  const expected = [
    [true, true, true, true, false],
    [true, true, true, false, false],
    [true, true, false, false, false],
    [true, false, false, false, false],
  ];
  for (const pips of expected) {
    await crash(page);
    await expect.poll(async () => (await snapshot(page)).hud.pips).toEqual(pips);
  }
  await crash(page);
  await expect
    .poll(async () => (await snapshot(page)).hud)
    .toMatchObject({
      lives: 'LIVES 2',
      pips: [true, true, true, true, true],
    });
});
