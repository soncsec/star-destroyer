import { expect, test, type Page } from '@playwright/test';
import { BOSSES } from '../../src/config/tuning';
import { LEVEL_2 } from '../../src/levels/level2';
import type { GameSnapshot } from '../../src/scenes/GameScene';

// These play whole boss fights (one or two), so they need longer than the default 30 s.
test.describe.configure({ timeout: 120_000 });

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openGame(page: Page): Promise<void> {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
}

/** Skips the waves, waits for the boss, and shoots it down with the level-3 gun. */
async function beatTheBoss(page: Page): Promise<void> {
  await page.evaluate(() => {
    const h = window.__starDestroyer;
    h?.clearEnemies();
    h?.skipWaves();
    h?.setShield(999); // the ship must survive; the flow is what's under test
    h?.setWeaponLevel(3);
  });
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 15_000 })
    .toBe('fighting');
  expect((await snapshot(page)).flow.stage).toBe('boss');
  await page.keyboard.down('Space');
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 60_000 })
    .toBe('defeated');
  await page.keyboard.up('Space');
}

test('the waves end, the boss comes in, and beating it completes level 1 and reaches level 2 (M4.5)', async ({
  page,
}) => {
  await openGame(page);
  const first = await snapshot(page);
  expect(first.level).toEqual({ number: 1, name: 'Teal Nebula' });
  expect(first.flow.stage).toBe('waves');
  expect(first.boss).toBeNull();

  await beatTheBoss(page);
  await expect
    .poll(async () => (await snapshot(page)).flow.panel.visible, { timeout: 20_000 })
    .toBe(true);
  const done = await snapshot(page);
  expect(done.flow.stage).toBe('complete');
  expect(done.flow.panel).toMatchObject({
    title: 'LEVEL 1 COMPLETE',
    name: 'TEAL NEBULA',
    next: 'NEXT: LEVEL 2',
  });
  expect(done.flow.panel.score).toBe(done.hud.score);
  expect(done.score).toBeGreaterThanOrEqual(BOSSES['spaceship-unit'].points);

  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).level.number, { timeout: 20_000 }).toBe(2);
  const two = await snapshot(page);
  expect(two.level.name).toBe(LEVEL_2.name);
  expect(two.flow.stage).toBe('waves');
  expect(two.flow.panel.visible).toBe(false);
  expect(two.boss).toBeNull();
  // Carried over: score, lives, health and weapon. The shield ends with the level.
  expect(two.score).toBe(done.score);
  expect(two.health.lives).toBe(done.health.lives);
  expect(two.health.hits).toBe(done.health.hits);
  expect(two.weaponLevel).toBe(3);
  expect(two.shield.timeLeft).toBe(0);
  // Level 2 plays its own waves with its own (harder) numbers.
  expect(two.difficulty.fire.interval).toBeLessThan(first.difficulty.fire.interval);
  await expect
    .poll(async () => (await snapshot(page)).enemies.map((e) => e.kind).sort(), { timeout: 20_000 })
    .toEqual(['grunt', 'grunt', 'grunt']);
});

test('after the last level, the panel says so and the next press starts a new game', async ({
  page,
}) => {
  await openGame(page);
  await beatTheBoss(page);
  await expect
    .poll(async () => (await snapshot(page)).flow.panel.visible, { timeout: 20_000 })
    .toBe(true);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).level.number, { timeout: 20_000 }).toBe(2);

  await beatTheBoss(page);
  await expect
    .poll(async () => (await snapshot(page)).flow.panel.visible, { timeout: 20_000 })
    .toBe(true);
  expect((await snapshot(page)).flow.panel).toMatchObject({
    title: 'LEVEL 2 COMPLETE',
    next: 'ALL LEVELS COMPLETE',
  });
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).level.number, { timeout: 20_000 }).toBe(1);
  const fresh = await snapshot(page);
  expect(fresh.score).toBe(0);
  expect(fresh.weaponLevel).toBe(1);
});

test('a fire key still held when the panel appears does not skip it', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => {
    const h = window.__starDestroyer;
    h?.clearEnemies();
    h?.skipWaves();
    h?.setShield(999);
    h?.setWeaponLevel(3);
  });
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 15_000 })
    .toBe('fighting');
  await page.keyboard.down('Space'); // held from the fight right through the panel
  await expect
    .poll(async () => (await snapshot(page)).flow.panel.visible, { timeout: 60_000 })
    .toBe(true);
  await page.waitForTimeout(1000);
  const s = await snapshot(page);
  expect(s.level.number).toBe(1);
  expect(s.flow.panel.visible).toBe(true);
  await page.keyboard.up('Space');
});
