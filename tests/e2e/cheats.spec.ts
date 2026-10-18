import { expect, test, type Page } from '@playwright/test';
import { CHEATS } from '../../src/config/tuning';
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

/** Every piece of text the game shows the player. */
async function visibleText(page: Page): Promise<string> {
  const s = await snapshot(page);
  return JSON.stringify([s.hud, s.gameOver, s.controls.overlay]);
}

test('typing the lives word adds 5 lives, with nothing on screen saying why', async ({ page }) => {
  await openQuietGame(page);
  await page.keyboard.type(CHEATS.words.lives.toLowerCase());
  await expect.poll(async () => (await snapshot(page)).health.lives).toBe(3 + CHEATS.extraLives);
  const s = await snapshot(page);
  expect(s.hud.lives).toBe(`LIVES ${3 + CHEATS.extraLives}`);
  expect(s.cheats.used).toBe(true);
  const text = await visibleText(page);
  for (const w of [...Object.values(CHEATS.words), 'CHEAT', 'INVINCIBLE'])
    expect(text).not.toContain(w);
});

test('the invincibility word makes the ship ignore hits; typing it again turns it off', async ({
  page,
}) => {
  const { player } = await openQuietGame(page);
  await page.keyboard.type(CHEATS.words.invincible.toLowerCase());
  await expect.poll(async () => (await snapshot(page)).cheats.invincible).toBe(true);

  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), player);
  await page.waitForTimeout(600);
  expect((await snapshot(page)).health.hits).toBe(0); // the crash did nothing

  await page.keyboard.type(CHEATS.words.invincible.toLowerCase());
  await expect.poll(async () => (await snapshot(page)).cheats.invincible).toBe(false);
  // That enemy flew on through the ship; a fresh one now hurts again.
  const { player: now } = await snapshot(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), now);
  await expect.poll(async () => (await snapshot(page)).health.hits, { timeout: 5_000 }).toBe(1);
});

test('the controls legend never lists the cheats', async ({ page }) => {
  await openQuietGame(page);
  await page.keyboard.press('p');
  const legend = (await snapshot(page)).controls.overlay.legend.join(' ');
  expect(legend).not.toMatch(/CHEAT|LIVES|INVINC/);
  for (const w of Object.values(CHEATS.words)) expect(legend).not.toContain(w);
});

test('cheat words typed while paused do nothing', async ({ page }) => {
  await openQuietGame(page);
  await page.keyboard.press('p');
  // P takes effect on the next frame; type only once the game is actually paused.
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('paused');
  await page.keyboard.type(CHEATS.words.lives.toLowerCase());
  await page.keyboard.press('p');
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('playing');
  const s = await snapshot(page);
  expect(s.health.lives).toBe(3);
  expect(s.cheats.used).toBe(false);
});
