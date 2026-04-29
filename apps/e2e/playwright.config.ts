import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const E2E_PORT = 3100;
const BASE_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Uses next start (production build) to avoid conflicts with next dev.
    // Run yarn build:frontend before yarn test:e2e.
    command: `yarn start -p ${E2E_PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    cwd: path.resolve(__dirname, '../../apps/frontend'),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
      KINDE_CLIENT_ID: process.env.KINDE_CLIENT_ID ?? 'e2e_placeholder_client_id',
      KINDE_CLIENT_SECRET: process.env.KINDE_CLIENT_SECRET ?? 'e2e_placeholder_client_secret',
      KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL ?? 'https://placeholder.kinde.com',
      KINDE_SITE_URL: BASE_URL,
      KINDE_POST_LOGOUT_REDIRECT_URL: BASE_URL,
      KINDE_POST_LOGIN_REDIRECT_URL: BASE_URL,
    },
  },
});
