import { expect, test, type Page } from '@playwright/test';
import { levelDifficulty } from '../../src/levels/difficulty';
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

  const start = await snapshot(page);
  expect(start.level).toEqual({ number: 1, name: LEVEL_1.name });
  expect(start.difficulty).toEqual(levelDifficulty(1));

  // The opening line of three grunts, exactly where the script puts them.
  const opening = LEVEL_1.waves.filter((s) => s.t === 0);
  await expect.poll(async () => (await snapshot(page)).enemies.length).toBe(opening.length);
  const first = await snapshot(page);
  expect(first.enemies.map((e) => ({ kind: e.kind, x: e.spawnX }))).toEqual(
    opening.map((s) => ({ kind: s.kind, x: s.x * WIDTH })),
  );

  // The next scripted spawn (a weaver at t=4) arrives on time: on the first
  // frame whose wave time reaches it. Watching every frame, the frame seen
  // just before the spawn must still be short of its time. (This holds however
  // long each frame takes on a busy machine.)
  const next = LEVEL_1.waves[opening.length];
  if (!next) throw new Error('script too short');
  const handle = await page.waitForFunction(
    (count) => {
      const w = window as unknown as { __lastWaveTime?: number };
      const s = window.__starDestroyer?.snapshot();
      if (!s) return null;
      if (s.waves.next > count) return { s, before: w.__lastWaveTime ?? -1 };
      w.__lastWaveTime = s.waves.time;
      return null;
    },
    opening.length,
    { polling: 'raf', timeout: 20_000 },
  );
  const { s: later, before } = (await handle.jsonValue()) as { s: GameSnapshot; before: number };
  expect(before).toBeGreaterThanOrEqual(0);
  expect(before).toBeLessThan(next.t);
  expect(later.waves.time).toBeGreaterThanOrEqual(next.t);
  expect(later.enemies.some((e) => e.kind === next.kind && e.spawnX === next.x * WIDTH)).toBe(true);
});
