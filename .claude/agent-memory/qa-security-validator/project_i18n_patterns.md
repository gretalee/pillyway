---
name: "i18n / locale-switch feature patterns"
description: "Security posture, test patterns, and architectural risks specific to the language-switch feature"
type: project
---

Pillyway uses next-intl v4 with a cookie-only locale strategy (no URL routing). Locale is `'de' | 'en'`; default is `'de'`. Cookie name is `pillyway-locale`.

**Why:** Locale detection is the sole middleware in the app. Any security or correctness failure here affects every page load.

**How to apply:** When reviewing middleware, i18n/request.ts, useLocaleStore, or LanguageSwitcher, always verify the allowlist validation and cookie attribute checks in the QA & Security Checklist appended to the ticket.

## Key risks to check on every i18n-related review
1. `resolveLocale()` must validate against `['de', 'en']` before use — an unvalidated cookie value reaching the dynamic import path is the primary injection risk
2. `setLocale` in useLocaleStore must write `SameSite=Lax; path=/; max-age=31536000` — verify exact cookie string, not just that a cookie exists
3. `<html lang>` must be set server-side (from middleware-resolved header) — a lang attribute set only after hydration is an SSR bug, not just a visual one
4. No translation value must ever pass through `dangerouslySetInnerHTML`
5. Middleware matcher must exclude `/api/*` — Kinde auth lives at `/api/auth/[kindeAuth]`

## Test file locations (written as stubs for feature/language-switch)
- `apps/frontend/store/locale-store.test.ts` — Zustand store (state + cookie)
- `apps/frontend/app/components/layout/LanguageSwitcher.test.tsx` — component (render, active state, click, keyboard)
- `apps/frontend/i18n/detectLocale.test.ts` — resolveLocale pure function
- `apps/e2e/tests/language-switch.spec.ts` — E2E (first load, switch, persistence, html lang, keyboard)

## Mocking conventions established for this feature
- `next-intl` mocked as `{ useTranslations: () => (key) => key }` in component tests
- `@/store/locale-store` mocked with `vi.mock` to expose a controllable `mockSetLocale` spy
- `next/navigation` mocked to expose `mockRefresh` spy (router.refresh() verification)

## Known pre-existing bug surfaced by this feature
- `next.config.ts` uses `__dirname` which is unavailable in ESM (`"type": "module"`). Must be replaced with `import.meta.dirname` as part of this ticket.
