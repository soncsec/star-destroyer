import { expect, test, type Page } from '@playwright/test';
import { CHEATS, HIGH_SCORE } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

const KEY = HIGH_SCORE.storageKey;

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

/** Scores 100 (one grunt), then loses the last life by crashing into an enemy. */
async function scoreThenDie(page: Page): Promise<void> {
  const { player } = await snapshot(page);
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, undefined, 999), player.x);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 20_000 }).toBe(100);
  await page.keyboard.up('Space');
  await page.evaluate(() => window.__starDestroyer?.oneHitLeft());
  const s = await snapshot(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), s.player);
  await expect
    .poll(async () => (await snapshot(page)).gameOver.visible, { timeout: 20_000 })
    .toBe(true);
}

const stored = (page: Page) => page.evaluate((k) => window.localStorage.getItem(k), KEY);

test('a first score becomes the high score: saved, announced, and kept for the next game (M7.2)', async ({
  page,
}) => {
  expect((await openQuietGame(page)).highScore).toEqual({ best: 0, isNew: false });
  await scoreThenDie(page);
  const over = await snapshot(page);
  expect(over.highScore).toEqual({ best: 100, isNew: true });
  expect(over.gameOver.high).toBe('NEW HIGH SCORE!');
  // Only the number is stored.
  expect(await stored(page)).toBe('100');
  expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual([KEY]);

  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).score).toBe(0);
  expect((await snapshot(page)).highScore).toEqual({ best: 100, isNew: false });
});

test('a lower score leaves the high score alone', async ({ page }) => {
  await page.addInitScript((k) => window.localStorage.setItem(k, '5000'), KEY);
  expect((await openQuietGame(page)).highScore.best).toBe(5000);
  await scoreThenDie(page);
  expect((await snapshot(page)).gameOver.high).toBe('HIGH SCORE 005000');
  expect(await stored(page)).toBe('5000');
});

test('a tampered stored value counts as no high score', async ({ page }) => {
  await page.addInitScript(
    (k) => window.localStorage.setItem(k, '<img src=x onerror=alert(1)>'),
    KEY,
  );
  expect((await openQuietGame(page)).highScore.best).toBe(0);
  await scoreThenDie(page);
  expect(await stored(page)).toBe('100');
});

test('a run that used a cheat never sets the high score', async ({ page }) => {
  await openQuietGame(page);
  await page.keyboard.type(CHEATS.words.lives.toLowerCase());
  await expect.poll(async () => (await snapshot(page)).cheats.used).toBe(true);
  await scoreThenDie(page);
  const over = await snapshot(page);
  expect(over.highScore).toEqual({ best: 0, isNew: false });
  expect(over.gameOver.high).toBe('HIGH SCORE 000000');
  expect(await stored(page)).toBeNull();
});

test('with storage blocked, the game plays on normally', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  expect((await openQuietGame(page)).highScore.best).toBe(0);
  await scoreThenDie(page);
  expect((await snapshot(page)).gameOver.high).toBe('NEW HIGH SCORE!');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).score).toBe(0);
  expect(errors).toEqual([]);
});

test('the title screen shows the high score once there is one', async ({ page }) => {
  await page.addInitScript((k) => window.localStorage.setItem(k, '4200'), KEY);
  await page.goto('./?title');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Title');
  const texts = await page.evaluate(() => window.__starDestroyer?.sceneTexts() ?? []);
  expect(texts).toContain('HIGH SCORE 004200');
});
