import { expect, test, type Page } from '@playwright/test';
import { BOSSES, FINAL_BOSS } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openQuietGame(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  await page.evaluate(() => {
    window.__starDestroyer?.setSpawning(false);
    window.__starDestroyer?.clearEnemies();
  });
  return errors;
}

const played = async (page: Page) => (await snapshot(page)).sfx.played;

test('the sounds are made in code and ready to play (M7.3)', async ({ page }) => {
  const errors = await openQuietGame(page);
  expect((await snapshot(page)).sfx.ready).toBe(true);
  // No sound files: nothing with an audio extension is ever requested.
  const audioRequests: string[] = [];
  page.on('request', (r) => {
    if (/\.(wav|mp3|ogg|m4a|flac)(\?|$)/i.test(r.url())) audioRequests.push(r.url());
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  expect(audioRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('firing, kills, pickups and hits each make their sound', async ({ page }) => {
  const errors = await openQuietGame(page);
  await page.evaluate(() => window.__starDestroyer?.fireShot());
  await expect.poll(async () => (await played(page)).shot).toBeGreaterThan(0);

  const { player } = await snapshot(page);
  await page.evaluate((x) => window.__starDestroyer?.spawnEnemy(x, undefined, 999), player.x);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await played(page)).enemyDown, { timeout: 20_000 }).toBe(1);
  await page.keyboard.up('Space');

  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnPickup('weapon', x, y), player);
  await expect.poll(async () => (await played(page)).weaponUp, { timeout: 20_000 }).toBe(1);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnPickup('shield', x, y), player);
  await expect.poll(async () => (await played(page)).shieldUp, { timeout: 20_000 }).toBe(1);
  await page.evaluate(() => window.__starDestroyer?.setShield(0));

  const s = await snapshot(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), s.player);
  await expect.poll(async () => (await played(page)).hurt, { timeout: 20_000 }).toBe(1);
  expect(errors).toEqual([]);
});

test('beating a boss and finishing a level each make their sound', async ({ page }) => {
  await openQuietGame(page);
  await page.evaluate(() => {
    const h = window.__starDestroyer;
    h?.setShield(999);
    h?.skipWaves();
    h?.setSpawning(true);
  });
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 20_000 })
    .toBe('fighting');
  await page.evaluate((hp) => window.__starDestroyer?.hurtBoss(hp), BOSSES['spaceship-unit'].hp);
  expect((await played(page)).bossDown).toBe(1);
  await expect.poll(async () => (await played(page)).levelComplete, { timeout: 20_000 }).toBe(1);
});

test("the final boss's beam sounds as it charges, and again as it fires", async ({ page }) => {
  await openQuietGame(page);
  await page.evaluate(() => {
    window.__starDestroyer?.setShield(999);
    window.__starDestroyer?.spawnBoss('final-boss');
  });
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 30_000 })
    .toBe('fighting');
  const p = FINAL_BOSS.parts;
  await page.evaluate(
    (hp) => window.__starDestroyer?.hurtBoss(hp),
    p.cannonLeft.hp + p.cannonRight.hp + p.helmet.hp,
  );
  await expect.poll(async () => (await played(page)).beam, { timeout: 30_000 }).toBe(1);
  expect((await played(page)).beamWarn).toBe(1);
});
