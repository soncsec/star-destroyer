import { expect, test, type Page } from '@playwright/test';
import { BOSSES, LEVEL_COMPLETE } from '../../src/config/tuning';
import { levelBossHp } from '../../src/levels/bosses';
import { LEVELS } from '../../src/levels';
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

test('every level runs waves, boss and panel in turn; after the last, the next press starts a new game', async ({
  page,
}) => {
  await openGame(page);
  for (const level of LEVELS) {
    expect((await snapshot(page)).level).toEqual({ number: level.number, name: level.name });
    // Straight to this level's own boss, then defeat it (the real fight is tested above).
    await page.evaluate(() => {
      const h = window.__starDestroyer;
      h?.clearEnemies();
      h?.skipWaves();
      h?.setShield(999);
    });
    await expect
      .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 20_000 })
      .toBe('fighting');
    expect((await snapshot(page)).boss?.kind).toBe(level.boss);
    // Every ship or part of it (a twin has two ships; the final boss, four parts).
    await page.evaluate((hp) => window.__starDestroyer?.hurtBoss(hp), levelBossHp(level.boss));
    const last = level.number === LEVELS.length;
    if (last) {
      // After the last level: the victory screen (M6.6), not a level panel.
      await expect
        .poll(async () => (await snapshot(page)).flow.victory.visible, { timeout: 20_000 })
        .toBe(true);
      const s = await snapshot(page);
      expect(s.flow.panel.visible).toBe(false);
      expect(s.flow.victory).toMatchObject({
        title: 'VICTORY',
        line: 'THE CORE IS DESTROYED',
        score: `FINAL ${s.hud.score}`,
        lives: `LIVES LEFT ${s.health.lives}`,
      });
    } else {
      await expect
        .poll(async () => (await snapshot(page)).flow.panel.visible, { timeout: 20_000 })
        .toBe(true);
      expect((await snapshot(page)).flow.panel).toMatchObject({
        title: `LEVEL ${level.number} COMPLETE`,
        next: `NEXT: LEVEL ${level.number + 1}`,
      });
    }
    await page.keyboard.press('Space');
    await expect
      .poll(async () => (await snapshot(page)).level.number, { timeout: 20_000 })
      .toBe(last ? 1 : level.number + 1);
  }
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

test('the victory screen waits for the player: no auto-advance, even well past the usual wait', async ({
  page,
}) => {
  await openGame(page);
  // Play through to the end, beating each boss at once.
  for (const level of LEVELS) {
    await page.evaluate(() => {
      const h = window.__starDestroyer;
      h?.clearEnemies();
      h?.skipWaves();
      h?.setShield(999);
    });
    await expect
      .poll(async () => (await snapshot(page)).boss?.mode, { timeout: 20_000 })
      .toBe('fighting');
    await page.evaluate((hp) => window.__starDestroyer?.hurtBoss(hp), levelBossHp(level.boss));
    if (level.number === LEVELS.length) break;
    await expect
      .poll(async () => (await snapshot(page)).flow.panel.visible, { timeout: 20_000 })
      .toBe(true);
    await page.keyboard.press('Space');
    await expect
      .poll(async () => (await snapshot(page)).level.number, { timeout: 20_000 })
      .toBe(level.number + 1);
  }
  // Wait in game time (not wall-clock) until well past the level panel's auto-advance.
  const pastAuto = LEVEL_COMPLETE.completeAfter + LEVEL_COMPLETE.autoNext + 1;
  await expect
    .poll(async () => (await snapshot(page)).flow.t, { timeout: 60_000 })
    .toBeGreaterThan(pastAuto);
  const s = await snapshot(page);
  expect(s.level.number).toBe(LEVELS.length);
  expect(s.flow.victory.visible).toBe(true);
  // Fireworks keep going off behind it (the boss's own explosions ended long ago).
  await expect
    .poll(async () => (await snapshot(page)).explosions, { timeout: 20_000 })
    .toBeGreaterThan(0);
});
