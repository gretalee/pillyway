---
name: "Language Switch (i18n) Architecture"
description: "Key decisions and constraints for the PILLY-I18N-001 language-switch feature: next-intl v4, cookie-only locale, single middleware, ESM fix"
type: project
---

next-intl v4.x was chosen for i18n (not react-i18next). Cookie-only locale strategy — no URL prefixes. Single `middleware.ts` for locale detection; Kinde auth uses only the App Router catch-all route handler and requires no middleware.

**Why:** Kinde SDK v2.12.1 does not need a middleware entry; all Kinde handling is in `app/api/auth/[kindeAuth]/route.ts`. next-intl v4 is ESM-only, matching the project's `"type": "module"` package.json. `router.refresh()` after locale switch is the required mechanism to re-run `i18n/request.ts` server-side.

**How to apply:** When touching middleware, locale store, or the layout for this feature — follow the decisions below and do not reintroduce URL-based routing or Kinde middleware.

## Decisions Made

- **Library**: `next-intl@^4.0.0` — peer deps confirmed: `next ^16.0.0`, `react ^19.0.0` both satisfied
- **Middleware matcher** excludes `/api/*`, `/_next/*`, static files with extensions; no Kinde coordination needed
- **`i18n/request.ts`**: reads `x-pillyway-locale` header (set by middleware), falls back to cookie, falls back to `'de'`; uses static conditional import (`locale === 'de' ? import('de.json') : import('en.json')`) to avoid dynamic-expression bundling issues under webpack
- **`NextIntlClientProvider`**: mounts in `layout.tsx` wrapping `<Providers>`, no props needed in v4 — context flows from `i18n/request.ts`
- **`LocaleStoreInitializer`**: Client Component, `useEffect` pattern, mirrors `UserStoreInitializer`; justified `useEffect` exception per CLAUDE.md
- **Typed keys**: `global.d.ts` augments `AppConfig` with `typeof de` from `messages/de.json`
- **`generateMetadata()`**: replaces static `metadata` export in `layout.tsx`; uses `getTranslations('meta')` (server-side, not the hook)
- **`__dirname` bug**: `next.config.ts` uses `__dirname` which is broken under ESM. Must be replaced with `import.meta.dirname` as part of this ticket

## Pre-existing Bug (surfaced by this feature)

`apps/frontend/next.config.ts` calls `path.resolve(__dirname)`. Under `"type": "module"` this throws at build time. Must fix in the same PR by replacing with `import.meta.dirname` (Node 24 supports this).

## File Paths Established

- `apps/frontend/middleware.ts` — NEW, locale detection only
- `apps/frontend/i18n/request.ts` — NEW, next-intl server config
- `apps/frontend/messages/de.json` — NEW, German strings
- `apps/frontend/messages/en.json` — NEW, English strings
- `apps/frontend/store/locale-store.ts` — NEW, Zustand locale slice
- `apps/frontend/providers/LocaleStoreInitializer.tsx` — NEW, mirrors UserStoreInitializer
- `apps/frontend/app/components/layout/LanguageSwitcher.tsx` — NEW, Client Component
- `apps/frontend/global.d.ts` — NEW or updated, AppConfig augmentation
