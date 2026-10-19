import { expect, test, type Page } from '@playwright/test';
import { LEVELS } from '../../src/levels';
import type { GameSnapshot } from '../../src/scenes/GameScene';

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
