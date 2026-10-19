import { expect, test, type Page } from '@playwright/test';
import { levelBossHp } from '../../src/levels/bosses';
import { LEVELS } from '../../src/levels';
import type { GameSnapshot } from '../../src/scenes/GameScene';

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openGame(page: Page, query: string): Promise<GameSnapshot> {
  await page.goto(`./${query}`);
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

test('?level=n starts the game at that level, as a cheat run (M7.9)', async ({ page }) => {
  const last = LEVELS.length;
  const s = await openGame(page, `?level=${last}`);
  expect(s.level).toEqual({ number: last, name: LEVELS[last - 1]?.name });
  expect(s.cheats.used).toBe(true);
  expect(s.score).toBe(0);
});

test('a level the game does not have, or a bad value, starts level 1 with no cheat', async ({
  page,
}) => {
  for (const query of [`?level=${LEVELS.length + 1}`, '?level=abc', '?level=0']) {
    const s = await openGame(page, query);
    expect(s.level.number, query).toBe(1);
    expect(s.cheats.used, query).toBe(false);
  }
});

test('without the parameter the game starts at level 1 and is not a cheat run', async ({
  page,
}) => {
  const s = await openGame(page, '?seed=7');
  expect(s.level.number).toBe(1);
  expect(s.cheats.used).toBe(false);
});

test('after the victory, the new game starts at level 1 as a normal run, not at ?level=n', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const last = LEVELS[LEVELS.length - 1];
  if (!last) throw new Error('no levels');
  await openGame(page, `?level=${last.number}`);
  await page.evaluate(() => {
    const h = window.__starDestroyer;
    h?.clearEnemies();
    h?.skipWaves();
    h?.setShield(999);
  });
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 30_000 })
    .toBe('fighting');
  await page.evaluate((hp) => window.__starDestroyer?.hurtBoss(hp), levelBossHp(last.boss));
  await expect
    .poll(async () => (await snapshot(page)).flow.victory.visible, { timeout: 30_000 })
    .toBe(true);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).level.number, { timeout: 20_000 }).toBe(1);
  const s = await snapshot(page);
  expect(s.cheats.used).toBe(false);
  expect(s.score).toBe(0);
});
