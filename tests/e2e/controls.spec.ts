import { expect, test, type Page } from '@playwright/test';
import type { GameSnapshot } from '../../src/scenes/GameScene';

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openGame(page: Page): Promise<GameSnapshot> {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__starDestroyer?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
  return snapshot(page);
}

const LEGEND = [
  'ARROWS/WASD MOVE',
  'SPACE FIRE',
  'P / ESC PAUSE',
  'Q QUIT',
  'H CONTROLS',
  'F FULL SCREEN',
  'M MUTE',
];

test('the controls legend shows at the start, then hides; H brings it back', async ({ page }) => {
  const s = await openGame(page);
  expect(s.controls.overlay).toMatchObject({ shown: 'legend', legend: LEGEND });
  await expect
    .poll(async () => (await snapshot(page)).controls.overlay.shown, { timeout: 20_000 })
    .toBe('none');
  await page.keyboard.press('h');
  await expect.poll(async () => (await snapshot(page)).controls.overlay.shown).toBe('legend');
  await page.keyboard.press('h');
  await expect.poll(async () => (await snapshot(page)).controls.overlay.shown).toBe('none');
});

for (const key of ['p', 'Escape']) {
  test(`${key} pauses the whole game, with the legend; pressing it again resumes`, async ({
    page,
  }) => {
    await openGame(page);
    await expect.poll(async () => (await snapshot(page)).enemies.length).toBeGreaterThan(0);
    await page.keyboard.press(key);
    await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('paused');
    const frozen = await snapshot(page);
    expect(frozen.controls.overlay).toMatchObject({
      shown: 'paused',
      title: 'PAUSED',
      hint: 'P TO RESUME',
      legend: LEGEND,
    });
    // Nothing moves while paused: not the enemies, not the waves, not the ship.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(800);
    await page.keyboard.up('ArrowLeft');
    const still = await snapshot(page);
    expect(still.enemies).toEqual(frozen.enemies);
    expect(still.waves.time).toBe(frozen.waves.time);
    expect(still.player).toEqual(frozen.player);

    await page.keyboard.press(key);
    await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('playing');
    await expect
      .poll(async () => (await snapshot(page)).waves.time)
      .toBeGreaterThan(frozen.waves.time);
  });
}

test('Q asks before quitting, and N goes back to the game', async ({ page }) => {
  await openGame(page);
  await page.keyboard.press('q');
  await expect
    .poll(async () => (await snapshot(page)).controls.overlay)
    .toMatchObject({
      shown: 'confirmQuit',
      title: 'QUIT TO ARCADE?',
      hint: 'Y / N',
    });
  const asking = await snapshot(page);
  await page.waitForTimeout(500);
  expect((await snapshot(page)).waves.time).toBe(asking.waves.time); // frozen while asking
  await page.keyboard.press('n');
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('playing');
});

test('Q then Y leaves for the arcade (one folder up)', async ({ page }) => {
  await openGame(page);
  const leaving = page.waitForRequest(
    (r) => r.isNavigationRequest() && r.frame() === page.mainFrame(),
  );
  await page.keyboard.press('q');
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('confirmQuit');
  await page.keyboard.press('y');
  const request = await leaving;
  // The game is served at the site root in tests, so "../" is the root again.
  expect(new URL(request.url()).pathname).toBe('/');
});

test('M mutes and unmutes', async ({ page }) => {
  await openGame(page);
  expect((await snapshot(page)).muted).toBe(false);
  await page.keyboard.press('m');
  await expect.poll(async () => (await snapshot(page)).muted).toBe(true);
  await page.keyboard.press('m');
  await expect.poll(async () => (await snapshot(page)).muted).toBe(false);
});

test('F switches to full screen and back', async ({ page }) => {
  await openGame(page);
  await page.keyboard.press('f');
  await expect.poll(async () => (await snapshot(page)).fullscreen).toBe(true);
  await page.keyboard.press('f');
  await expect.poll(async () => (await snapshot(page)).fullscreen).toBe(false);
});

test('in full screen the game sits in the middle of the screen', async ({ page }) => {
  await openGame(page);
  await page.keyboard.press('f');
  await expect.poll(async () => (await snapshot(page)).fullscreen).toBe(true);
  // Measure once the canvas has settled at its full-screen size.
  const gaps = async () =>
    page.evaluate(() => {
      const r = document.querySelector('canvas')?.getBoundingClientRect();
      if (!r) return null;
      return {
        left: Math.round(r.left),
        right: Math.round(window.innerWidth - r.right),
        top: Math.round(r.top),
        bottom: Math.round(window.innerHeight - r.bottom),
      };
    });
  await expect
    .poll(async () => {
      const g = await gaps();
      return !!g && Math.abs(g.left - g.right) <= 1 && Math.abs(g.top - g.bottom) <= 1;
    })
    .toBe(true);
});

test("pausing isn't possible after game over, but quitting is", async ({ page }) => {
  const s = await openGame(page);
  await page.evaluate(() => {
    window.__starDestroyer?.setSpawning(false);
    window.__starDestroyer?.clearEnemies();
    window.__starDestroyer?.oneHitLeft();
  });
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), s.player);
  await expect
    .poll(async () => (await snapshot(page)).gameOver.visible, { timeout: 20_000 })
    .toBe(true);
  await page.keyboard.press('p');
  await page.waitForTimeout(200);
  expect((await snapshot(page)).controls.mode).toBe('playing');
  await page.keyboard.press('q');
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('confirmQuit');
});
