import { Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export async function setLanguageTo(page: Page, lang: 'en' | 'de' = 'en'): Promise<void> {
  await page
    .context()
    .addCookies([{ name: 'pillyway-locale', value: lang, url: BASE_URL }]);
}
