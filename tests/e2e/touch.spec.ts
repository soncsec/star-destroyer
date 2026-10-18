import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { GAME_HEIGHT, GAME_WIDTH } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

// Touch play on a phone (owner request 2026-10-18). Real touch events go in
// through the browser's DevTools protocol, as a finger's would.

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__starDestroyer?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

const sceneKey = (page: Page) => page.evaluate(() => window.__starDestroyer?.scene() ?? null);

/** Page coordinates of game pixel (x, y). */
async function toPage(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return { x: box.x + (x * box.width) / GAME_WIDTH, y: box.y + (y * box.height) / GAME_HEIGHT };
}

class Finger {
  constructor(
    private readonly cdp: CDPSession,
    private readonly page: Page,
  ) {}
  async down(x: number, y: number): Promise<void> {
    const p = await toPage(this.page, x, y);
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  }
  async move(x: number, y: number): Promise<void> {
    const p = await toPage(this.page, x, y);
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] });
  }
  async up(): Promise<void> {
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  async tap(x: number, y: number): Promise<void> {
    await this.down(x, y);
    await this.up();
  }
}

async function open(page: Page, query = ''): Promise<Finger> {
  await page.goto(`./${query}`);
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).not.toBeNull();
  return new Finger(await page.context().newCDPSession(page), page);
}

async function quietGame(page: Page): Promise<Finger> {
  const finger = await open(page);
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Game');
  await page.evaluate(() => {
    window.__starDestroyer?.setSpawning(false);
    window.__starDestroyer?.clearEnemies();
  });
  return finger;
}

test('on a phone the game fills the screen, and a tap on the title starts it', async ({ page }) => {
  const finger = await open(page, '?title');
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Title');
  const texts = await page.evaluate(() => window.__starDestroyer?.sceneTexts() ?? []);
  expect(texts).toContain('TAP TO START');
  expect(texts).toContain('BACK TO ARCADE');
  // Fills the width or the height (whichever runs out first), not a small whole-number zoom.
  const box = await page.locator('canvas').boundingBox();
  const view = page.viewportSize();
  expect(box && view).toBeTruthy();
  if (box && view) {
    const fill = Math.max(box.width / view.width, box.height / view.height);
    expect(fill).toBeGreaterThan(0.98);
  }
  await finger.tap(128, 120);
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Game');
});

test('dragging steers the ship by as far as the finger moves, firing while touching', async ({
  page,
}) => {
  const finger = await quietGame(page);
  const start = (await snapshot(page)).player;
  expect((await snapshot(page)).touch.used).toBe(true); // a phone: touch buttons from the start
  // Touch well away from the ship (the finger never needs to cover it), then drag up-left.
  await finger.down(200, 300);
  await finger.move(170, 260);
  await expect
    .poll(
      async () => {
        const p = (await snapshot(page)).player;
        return (
          Math.round(p.x) === Math.round(start.x - 30) &&
          Math.round(p.y) === Math.round(start.y - 40)
        );
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  expect((await snapshot(page)).touch.dragging).toBe(true);
  await expect
    .poll(async () => (await snapshot(page)).shots, { timeout: 20_000 })
    .toBeGreaterThan(0);
  await finger.up();
  await expect.poll(async () => (await snapshot(page)).touch.dragging).toBe(false);
  // Without a finger down, the shots run out and no more are fired.
  await expect.poll(async () => (await snapshot(page)).shots, { timeout: 20_000 }).toBe(0);
});

test('the pause button opens the touch menu: resume, and quit with yes / no', async ({ page }) => {
  const finger = await quietGame(page);
  const pause = (await snapshot(page)).touch.buttons.find((b) => b.action === 'pause');
  expect(pause).toBeTruthy();
  await finger.tap(pause?.x ?? 0, pause?.y ?? 0);
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('paused');
  let s = await snapshot(page);
  expect(s.touch.buttons.map((b) => b.label)).toEqual([
    'RESUME',
    'QUIT',
    'SOUND OFF',
    'FULL SCREEN',
  ]);
  expect(s.controls.overlay.title).toBe('PAUSED');
  const at = (label: string) => s.touch.buttons.find((b) => b.label === label);

  await finger.tap(at('SOUND OFF')?.x ?? 0, at('SOUND OFF')?.y ?? 0);
  await expect.poll(async () => (await snapshot(page)).muted).toBe(true);
  s = await snapshot(page);
  await finger.tap(at('QUIT')?.x ?? 0, at('QUIT')?.y ?? 0);
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('confirmQuit');
  s = await snapshot(page);
  expect(s.touch.buttons.map((b) => b.label)).toEqual(['YES, QUIT', 'NO']);
  await finger.tap(at('NO')?.x ?? 0, at('NO')?.y ?? 0);
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('paused');
  s = await snapshot(page);
  await finger.tap(at('RESUME')?.x ?? 0, at('RESUME')?.y ?? 0);
  await expect.poll(async () => (await snapshot(page)).controls.mode).toBe('playing');
});

test('after game over, a tap plays again', async ({ page }) => {
  const finger = await quietGame(page);
  await page.evaluate(() => window.__starDestroyer?.oneHitLeft());
  const s = await snapshot(page);
  await page.evaluate(({ x, y }) => window.__starDestroyer?.spawnEnemy(x, y, 999), s.player);
  await expect
    .poll(async () => (await snapshot(page)).gameOver.visible, { timeout: 20_000 })
    .toBe(true);
  expect((await snapshot(page)).gameOver.prompt).toBe('TAP TO PLAY AGAIN');
  await finger.tap(128, 200);
  await expect
    .poll(async () => (await snapshot(page)).health.gameOver, { timeout: 20_000 })
    .toBe(false);
});
