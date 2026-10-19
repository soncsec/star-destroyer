import { expect, test } from '@playwright/test';

// Players start at the title; the e2e build skips it unless ?title is given.
const sceneKey = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__starDestroyer?.scene() ?? null);

test('the title screen comes first, and Space starts a game (M7.1)', async ({ page }) => {
  await page.goto('./?title');
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Title');
  // It waits there.
  await page.waitForTimeout(1000);
  expect(await sceneKey(page)).toBe('Title');
  await page.keyboard.press('Space');
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Game');
  const s = await page.evaluate(() => window.__starDestroyer?.snapshot());
  expect(s?.level.number).toBe(1);
  expect(s?.score).toBe(0);
});

test('Enter starts a game too', async ({ page }) => {
  await page.goto('./?title');
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Title');
  await page.keyboard.press('Enter');
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Game');
});

test('Q on the title screen goes straight back to the arcade (one folder up)', async ({ page }) => {
  await page.goto('./?title');
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Title');
  const leaving = page.waitForRequest(
    (r) => r.isNavigationRequest() && r.frame() === page.mainFrame(),
  );
  await page.keyboard.press('q');
  const request = await leaving;
  // The game is served at the site root in tests, so "../" is the root again.
  expect(new URL(request.url()).pathname).toBe('/');
  expect(new URL(request.url()).search).toBe('');
});

test('with ?level=n, starting from the title plays that level (the M7.9 play-test skip)', async ({
  page,
}) => {
  await page.goto('./?title&level=3');
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Title');
  await page.keyboard.press('Space');
  await expect.poll(() => sceneKey(page), { timeout: 15_000 }).toBe('Game');
  const s = await page.evaluate(() => window.__starDestroyer?.snapshot());
  expect(s?.level.number).toBe(3);
  expect(s?.cheats.used).toBe(true);
});
