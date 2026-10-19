import { expect, test, type Page } from '@playwright/test';
import { FINAL_BOSS, FRAME_BUDGET, type EnemyKind } from '../../src/config/tuning';
import { summariseFrames, withinBudget } from '../../src/logic/perf';
import type { GameSnapshot } from '../../src/scenes/GameScene';

// Sampling several seconds of a busy fight takes a while on a shared machine.
test.describe.configure({ timeout: 120_000 });

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/** Frames to sample: about 5 s at 60 fps. */
const FRAMES = 300;

test('the final boss fight keeps every frame within the 60 fps budget (M6.7)', async ({
  page,
}, info) => {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  await page.evaluate(() => {
    const h = window.__starDestroyer;
    h?.setSpawning(false);
    h?.clearEnemies();
    h?.setShield(999);
    h?.setWeaponLevel(4);
    h?.spawnBoss('final-boss');
  });
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 30_000 })
    .toBe('fighting');
  // The busiest stage: the core, with its beam, after the cannons and helmet.
  const p = FINAL_BOSS.parts;
  await page.evaluate(
    (hp) => window.__starDestroyer?.hurtBoss(hp),
    p.cannonLeft.hp + p.cannonRight.hp + p.helmet.hp,
  );
  // A full screen around it: a dozen enemies of every kind, and asteroids.
  const kinds: EnemyKind[] = ['eye', 'flyer', 'weaver', 'grunt', 'skull', 'diver'];
  await page.evaluate(
    (ks) => {
      const h = window.__starDestroyer;
      ks.forEach((k, i) => {
        h?.spawnEnemy(40 + (i % 6) * 35, 150 + Math.floor(i / 6) * 40, 0.5, k);
      });
      for (let i = 0; i < 4; i++) h?.spawnAsteroid(50 + i * 50, 120);
    },
    [...kinds, ...kinds],
  );
  // Fire non-stop with the top weapon, the level-4 spread of three rays.
  await page.keyboard.down('Space');
  await page.evaluate(() => window.__starDestroyer?.frameTimes(true));
  const beams = new Set<string>();
  await expect
    .poll(
      async () => {
        beams.add((await snapshot(page)).boss?.beam ?? '');
        return (await page.evaluate(() => window.__starDestroyer?.frameTimes()))?.workMs.length;
      },
      { timeout: 90_000, intervals: [200] },
    )
    .toBeGreaterThanOrEqual(FRAMES);
  await page.keyboard.up('Space');

  const times = await page.evaluate(() => window.__starDestroyer?.frameTimes());
  const summary = summariseFrames(times?.workMs ?? []);
  const report = `median ${summary.medianMs.toFixed(2)} ms, 95% ${summary.p95Ms.toFixed(2)} ms, max ${summary.maxMs.toFixed(2)} ms over ${summary.frames} frames; Phaser fps ${times?.fps.toFixed(1)}; beam ${[...beams].join('/')}`;
  info.annotations.push({ type: 'frame times', description: report });
  console.log(`[${info.project.name}] ${report}`);
  // Firefox has its own, looser limit for the slowest frames (see FRAME_BUDGET).
  const budget = info.project.name === 'firefox' ? FRAME_BUDGET.firefox : FRAME_BUDGET;
  expect(withinBudget(summary, budget), report).toBe(true);
});
