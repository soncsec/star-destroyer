import { expect, test, type Page } from '@playwright/test';
import { FINAL_BOSS } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

// A whole fight through three stages, so longer than the default limit.
test.describe.configure({ timeout: 120_000 });

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openFinalBoss(page: Page): Promise<void> {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  await page.evaluate(() => {
    const h = window.__starDestroyer;
    h?.setSpawning(false);
    h?.clearEnemies();
    h?.setShield(999);
    h?.spawnBoss('final-boss');
  });
  await expect
    .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 30_000 })
    .toBe('fighting');
}

const hurt = (page: Page, hp: number) =>
  page.evaluate((n) => window.__starDestroyer?.hurtBoss(n), hp);

test('the final boss: its armour blocks shots until each part’s stage comes', async ({ page }) => {
  await openFinalBoss(page);
  const start = await snapshot(page);
  expect(start.boss).toMatchObject({ kind: 'final-boss', stage: 'cannons', beam: 'idle' });
  expect(start.boss?.ships).toHaveLength(4);
  // Straight up from the middle, shots strike the helmet or the hull: blocked.
  const sparks = start.sparks;
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.__starDestroyer?.fireShot());
    await page.waitForTimeout(150);
  }
  await expect
    .poll(async () => (await snapshot(page)).sparks, { timeout: 20_000 })
    .toBeGreaterThan(sparks);
  expect((await snapshot(page)).boss?.hp).toBe(start.boss?.hp);
});

test('the final boss: cannons, then the helmet, then the core and its beam, which always warns first', async ({
  page,
}) => {
  await openFinalBoss(page);
  const p = FINAL_BOSS.parts;
  const score = (await snapshot(page)).score;
  await hurt(page, p.cannonLeft.hp);
  let s = await snapshot(page);
  expect(s.boss?.ships[0]?.mode).toBe('defeated');
  expect(s.boss?.stage).toBe('cannons');
  await hurt(page, p.cannonRight.hp);
  expect((await snapshot(page)).boss?.stage).toBe('helmet');
  await hurt(page, p.helmet.hp);
  s = await snapshot(page);
  expect(s.boss?.stage).toBe('core');
  expect(s.score).toBe(score + p.cannonLeft.points + p.cannonRight.points + p.helmet.points);

  // Watch the beam: it must be seen warning before it is seen firing.
  const seen: string[] = [];
  await expect
    .poll(
      async () => {
        const beam = (await snapshot(page)).boss?.beam ?? '';
        if (seen[seen.length - 1] !== beam) seen.push(beam);
        return seen.includes('firing');
      },
      { timeout: 30_000, intervals: [50] },
    )
    .toBe(true);
  expect(seen.indexOf('warning')).toBeGreaterThanOrEqual(0);
  expect(seen.indexOf('warning')).toBeLessThan(seen.indexOf('firing'));

  await hurt(page, p.core.hp);
  s = await snapshot(page);
  expect(s.boss?.mode).toBe('defeated');
  expect(s.boss?.barVisible).toBe(false);
  expect(s.score).toBe(
    score + p.cannonLeft.points + p.cannonRight.points + p.helmet.points + p.core.points,
  );
});

test('the final boss: its beam costs the ship a hit', async ({ page }) => {
  await openFinalBoss(page);
  const p = FINAL_BOSS.parts;
  await hurt(page, p.cannonLeft.hp + p.cannonRight.hp + p.helmet.hp);
  // While the beam charges (the boss holds still and stops shooting), line the
  // ship up under the core; drop the shield only once the beam fires.
  await expect
    .poll(async () => (await snapshot(page)).boss?.beam, { timeout: 30_000, intervals: [50] })
    .toBe('warning');
  const bossX = (await snapshot(page)).boss?.x ?? 128;
  // Line the ship up under the core while the beam charges.
  for (let i = 0; i < 40; i++) {
    const dx = bossX - (await snapshot(page)).player.x;
    if (Math.abs(dx) < 3) break;
    const key = dx < 0 ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.down(key);
    await page.waitForTimeout(Math.min(200, Math.abs(dx) * 4));
    await page.keyboard.up(key);
  }
  await expect
    .poll(async () => (await snapshot(page)).boss?.beam, { timeout: 20_000, intervals: [20] })
    .toBe('firing');
  await page.evaluate(() => window.__starDestroyer?.setShield(0));
  await expect.poll(async () => (await snapshot(page)).lastHitBy, { timeout: 20_000 }).toBe('beam');
});
