// @ts-check
import eslint from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

// `ignores` gets its own object (nothing else in it) — that's the only shape
// ESLint treats as a *global* ignore, applying no matter what other config
// objects get added later. Combining it with other keys would instead just
// limit that one object's own reach, not act as a repo-wide exclusion.
//
// Playwright's config is scoped to `files: ['tests/**/*.ts']` so its
// test-authoring rules (e.g. expect-expect, no-focused-test) only apply to
// spec files, not to files like playwright.config.ts.
export default defineConfig(
  {
    ignores: ['eslint.config.mjs', 'playwright-report/**', 'test-results/**'],
  },
  {
    extends: [eslint.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
  },
);
