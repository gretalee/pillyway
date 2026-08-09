import type { Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export async function setLanguageToEnglish(page: Page): Promise<void> {
  await page
    .context()
    .addCookies([{ name: 'pillyway-locale', value: 'en', url: BASE_URL }]);
}

export * from './login-helpers';
export * from './camino-helpers';
