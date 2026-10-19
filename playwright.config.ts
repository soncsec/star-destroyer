import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
// An explicit address, so the test server and the browsers always agree on
// where to connect, however "localhost" resolves on the machine.
const HOST = '127.0.0.1';
const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Game time advances with each frame, and other sessions share this machine:
  // when it is busy, frames (and so game time) slow down. Generous wall-clock
  // limits let a waited-for game event still arrive; the checks are unchanged,
  // and on a healthy machine they pass just as fast.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://${HOST}:${PORT}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /touch\.spec\.ts/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /touch\.spec\.ts/ },
    // A phone (owner request 2026-10-18): touch play, on Chromium's phone emulation.
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /touch\.spec\.ts/ },
  ],
  webServer: {
    // The e2e build is the normal build plus the test hook (src/debug/testHook.ts).
    command: `npm run build:e2e && vite preview --outDir dist-e2e --host ${HOST} --port ${PORT} --strictPort`,
    url: `http://${HOST}:${PORT}/`,
    // Never reuse a server already on the port: one that isn't ours can vanish
    // mid-run and fail every remaining test with "connection refused". Better
    // to stop at once with "port already in use". (Other Claude sessions on this
    // machine must also never stop processes by name, e.g. `pkill -f vite`.)
    reuseExistingServer: false,
    // Show the server's own output, so a crash explains itself in the test log.
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
});
