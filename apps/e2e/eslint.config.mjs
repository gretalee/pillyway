// @ts-check
import eslint from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'playwright-report/**', 'test-results/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Playwright's own request/route/page objects are all `any`-flavored
      // in ways typescript-eslint's stricter checked rules complain about
      // (e.g. `(await res.json())` return type); this repo already turns
      // these down to warnings in the backend config for the same reason.
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
    },
  },
);
