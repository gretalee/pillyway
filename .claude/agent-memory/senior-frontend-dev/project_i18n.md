---
name: Pillyway i18n architecture
description: next-intl v4 setup, locale detection strategy, store hydration pattern, and cookie design decisions
type: project
---

next-intl v4 is installed (^4.0.0). Cookie-only locale strategy — no URL-based routing. Single middleware handles locale detection.

Key files:
- `apps/frontend/i18n/detectLocale.ts` — `resolveLocale(raw)` pure named export, tested independently
- `apps/frontend/i18n/request.ts` — next-intl server config; reads x-pillyway-locale header then pillyway-locale cookie
- `apps/frontend/middleware.ts` — sole middleware; writes x-pillyway-locale header; excludes /api/*, /_next/*, static assets
- `apps/frontend/store/locale-store.ts` — Zustand slice; setLocale writes pillyway-locale cookie (max-age=31536000, SameSite=Lax, no Secure)
- `apps/frontend/providers/LocaleStoreInitializer.tsx` — hydrates Zustand from server locale (mirrors UserStoreInitializer pattern)
- `apps/frontend/messages/de.json` + `en.json` — namespaced translation files; de is the default/fallback
- `apps/frontend/global.d.ts` — AppConfig augmentation for typed next-intl key lookups

**Why:** German is the primary market and fallback. Cookie-only locale avoids URL churn. next-intl v4 chosen for native App Router compatibility and ESM-only build (project uses "type": "module").

**How to apply:** When adding new UI strings, always add keys to both de.json and en.json. Use `getTranslations()` in Server Components, `useTranslations()` in Client Components. Header is a Server Component — do not convert it to client just to add i18n. next-intl v4 NextIntlClientProvider requires no props in layout.tsx.

Cookie attributes: pillyway-locale, max-age=31536000, path=/, SameSite=Lax — no Secure (intentional; non-sensitive value, works on local HTTP).

resolveLocale behavior: lowercases, splits on '-' to strip subtags (en-US → en), validates against ['de','en'] allowlist, falls back to 'de'. Handles null, undefined, empty string, '*', and malformed values safely.
