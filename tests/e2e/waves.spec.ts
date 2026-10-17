import { expect, test, type Page } from '@playwright/test';
import { LEVEL_1 } from '../../src/levels/level1';
import type { GameSnapshot } from '../../src/scenes/GameScene';

const WIDTH = 256;

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

test('the game plays level 1 from its wave script', async ({ page }) => {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');

  // The opening line of three grunts, exactly where the script puts them.
  const opening = LEVEL_1.waves.filter((s) => s.t === 0);
  await expect.poll(async () => (await snapshot(page)).enemies.length).toBe(opening.length);
  const first = await snapshot(page);
  expect(first.enemies.map((e) => ({ kind: e.kind, x: e.spawnX }))).toEqual(
    opening.map((s) => ({ kind: s.kind, x: s.x * WIDTH })),
  );

  // The next scripted spawn (a weaver at t=4) arrives on time, give or take a frame or two.
  const next = LEVEL_1.waves[opening.length];
  if (!next) throw new Error('script too short');
  const handle = await page.waitForFunction(
    (count) => {
      const s = window.__starDestroyer?.snapshot();
      return s && s.waves.next > count ? s : null;
    },
    opening.length,
    { polling: 'raf', timeout: 10_000 },
  );
  const later = (await handle.jsonValue()) as GameSnapshot;
  expect(later.waves.time).toBeGreaterThanOrEqual(next.t);
  expect(later.waves.time).toBeLessThan(next.t + 0.1);
  expect(later.enemies.some((e) => e.kind === next.kind && e.spawnX === next.x * WIDTH)).toBe(true);
});
