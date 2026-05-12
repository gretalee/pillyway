import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';

// Explicitly load apps/e2e/.env so env vars are available regardless of CWD.
// Playwright's automatic .env loading is unreliable in yarn --cwd monorepo setups.
config({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
