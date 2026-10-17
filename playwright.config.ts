import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    // The e2e build is the normal build plus the test hook (src/debug/testHook.ts).
    command: `npm run build:e2e && vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    // Never reuse a server already on the port: a left-over one (e.g. from an
    // interrupted run) can vanish mid-run and fail every remaining test with
    // "connection refused". Better to stop at once with "port already in use".
    reuseExistingServer: false,
    // Show the server's own output, so a crash explains itself in the test log.
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
});
