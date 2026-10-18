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
  await expect.poll(async () => (await snapshot(page)).health.gameOver).toBe(true);
}

test('losing the last life shows GAME OVER with the final score', async ({ page }) => {
  await openQuietGame(page);
  await scoreThenDie(page);
  // Not straight away: the explosion plays first.
  expect((await snapshot(page)).gameOver.visible).toBe(false);
  await expect.poll(async () => (await snapshot(page)).gameOver.visible).toBe(true);
  const over = await snapshot(page);
  expect(over.gameOver).toMatchObject({
    title: 'GAME OVER',
    score: 'SCORE 000100',
    prompt: 'PRESS SPACE TO PLAY AGAIN',
  });
  // The HUD agrees: no lives, every health pip out.
  expect(over.hud).toMatchObject({ lives: 'LIVES 0', pips: [false, false, false, false, false] });
});

test('holding fire through the death does not restart the game', async ({ page }) => {
  await openQuietGame(page);
  await page.evaluate(() => window.__starDestroyer?.oneHitLeft());
  await page.keyboard.down('Space'); // firing when the ship dies
  const { player } = await snapshot(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), player);
  await expect
    .poll(async () => (await snapshot(page)).gameOver.visible, { timeout: 20_000 })
    .toBe(true);
  await page.waitForTimeout(1500); // still holding
  const s = await snapshot(page);
  expect(s.gameOver.visible).toBe(true);
  expect(s.gameOver.armed).toBe(false);
  await page.keyboard.up('Space');
});

for (const key of ['Space', 'Enter']) {
  test(`a fresh ${key} press starts a new game from the beginning`, async ({ page }) => {
    await openQuietGame(page);
    await scoreThenDie(page);
    await expect.poll(async () => (await snapshot(page)).gameOver.armed).toBe(true);
    await page.keyboard.press(key);

    // A brand-new game: the scene restarts with spawning on and a fresh state.
    await expect
      .poll(async () => (await snapshot(page)).health.gameOver, { timeout: 20_000 })
      .toBe(false);
    const fresh = await snapshot(page);
    expect(fresh.score).toBe(0);
    expect(fresh.health).toMatchObject({ hits: 0, lives: 3 });
    expect(fresh.hud).toMatchObject({ score: 'SCORE 000000', lives: 'LIVES 3' });
    expect(fresh.gameOver.visible).toBe(false);
    expect(fresh.waves.time).toBeLessThan(2); // level 1 started over
    // And it plays: the opening wave arrives.
    await expect.poll(async () => (await snapshot(page)).enemies.length).toBeGreaterThan(0);
  });
}
