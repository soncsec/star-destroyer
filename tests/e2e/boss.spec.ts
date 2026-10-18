import { expect, test, type Page } from '@playwright/test';
import { BOSSES } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

const BOSS = BOSSES['spaceship-unit'];

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openBossFight(page: Page): Promise<GameSnapshot> {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  await page.evaluate(() => {
    const h = window.__starDestroyer;
    h?.setSpawning(false);
    h?.clearEnemies();
    h?.setShield(999); // keep the ship alive; the fight itself is what's under test
    h?.spawnBoss();
  });
  return snapshot(page);
}

test('the boss flies in from above, untouchable, then fights with a full health bar', async ({
  page,
}) => {
  const s = await openBossFight(page);
  expect(s.boss).toMatchObject({ kind: 'spaceship-unit', mode: 'entering', hp: BOSS.hp });
  expect(s.boss?.y).toBeLessThan(0);
  expect(s.boss?.barVisible).toBe(true);

  // Shots fired while it is entering do no damage.
  await page.evaluate(() => window.__starDestroyer?.fireShot());
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 10_000 })
    .toBe('fighting');
  const fighting = await snapshot(page);
  expect(fighting.boss?.hp).toBe(BOSS.hp);
  expect(fighting.boss?.bar).toBe(1);
  expect(fighting.boss?.y).toBe(BOSS.entry.hoverY);
});

test('the boss fires at the ship once it is fighting', async ({ page }) => {
  await openBossFight(page);
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 10_000 })
    .toBe('fighting');
  await expect
    .poll(async () => (await snapshot(page)).enemyShots.length, { timeout: 5_000 })
    .toBeGreaterThan(0);
});

test('shots wear the boss down through its phases to defeat, scoring its points', async ({
  page,
}) => {
  const start = await openBossFight(page);
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 10_000 })
    .toBe('fighting');
  await page.evaluate(() => window.__starDestroyer?.setWeaponLevel(3));
  await page.keyboard.down('Space');

  // Health falls and the bar follows it; the phase moves on as it weakens.
  await expect
    .poll(async () => (await snapshot(page)).boss?.phase, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(1);
  const hurt = await snapshot(page);
  expect(hurt.boss?.hp).toBeLessThan(BOSS.hp);
  expect(hurt.boss?.bar).toBeCloseTo((hurt.boss?.hp ?? 0) / BOSS.hp, 2);

  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 60_000 })
    .toBe('defeated');
  await page.keyboard.up('Space');
  const done = await snapshot(page);
  expect(done.boss?.hp).toBe(0);
  expect(done.boss?.barVisible).toBe(false);
  expect(done.score).toBe(start.score + BOSS.points);
  expect(done.blast).toBe(true);
});
