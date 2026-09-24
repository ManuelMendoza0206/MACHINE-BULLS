import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];
// Own port to avoid clashing with a plain `npm run dev` (3000) during local runs.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 1 : undefined,
  timeout: 60_000,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    // In CI serve the production build (closer to reality); locally, the dev server.
    // Invoke `next` directly — `npm run ... -- -p` passthrough is unreliable across shells.
    command: isCI ? `npx next build && npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // apiRequest() throws at call time without this; no .env.local exists in CI/most dev
      // machines. Every e2e spec that hits the API mocks it via page.route(), so this origin
      // is never actually dialed — it only has to be a syntactically valid URL.
      NEXT_PUBLIC_API_BASE_URL: process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:8000',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
