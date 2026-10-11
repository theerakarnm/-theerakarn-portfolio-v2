import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/parity',
  outputDir: 'test-results',
  timeout: 240_000,
  workers: 1,
  reporter: 'list',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bunx astro dev --port 4401',
    url: 'http://localhost:4401/',
    reuseExistingServer: false,
  },
});
