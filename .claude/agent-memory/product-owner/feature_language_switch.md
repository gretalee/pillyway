---
name: "Language Switch feature decisions"
description: "Key product decisions for the DE/EN language switcher (PILLY-I18N-001) — locale strategy, library choice, store shape, and out-of-scope items"
type: project
---

Ticket PILLY-I18N-001 defines the language-switch feature. See `.claude/tickets/feature-language-switch.md` for the full specification.

**Why:** Foundational i18n infrastructure that must land before significant content work. CLAUDE.md already mandates no hardcoded strings; current codebase violates this.

**How to apply:** Reference these decisions in any future ticket that touches i18n, the Header, or locale-aware rendering.

## Key Decisions

### Library: next-intl
Chosen over `react-i18next` for native App Router Server Component support, typed keys, and cookie-based locale detection without URL routing.
Confirm version compatibility with Next.js 16.2.4 before install.

### No URL-based locale routing
`/de/caminos` and `/en/caminos` are explicitly out of scope. Locale lives in a `pillyway-locale` cookie (max-age 1 year, SameSite=Lax) and Zustand only. URLs remain locale-neutral.

### Default language: German (`de`)
German is the fallback when no browser or OS language can be matched against `['de', 'en']`.

### Detection priority (first visit)
1. `pillyway-locale` cookie (set by previous visit or explicit switch)
2. `Accept-Language` / `navigator.language` — first match against `['de', 'en']`
3. `navigator.languages` array (OS language fallback)
4. Hardcoded default: `'de'`

Detection runs in `middleware.ts` (server-side) and is injected into the request via an `x-locale` header so Server Components can read it without a client round-trip.

### Zustand store: useLocaleStore
New slice alongside `useUserStore`. Shape: `{ locale: 'de' | 'en', setLocale }`.
`setLocale` writes the cookie client-side. Initialised from server locale via `LocaleStoreInitializer` (mirrors `UserStoreInitializer` pattern already in the codebase).

### Header placement
`LanguageSwitcher` is a Client Component inserted immediately to the left of `<nav aria-label="Account navigation">` in `Header.tsx`.

### Translation file location
`apps/frontend/messages/de.json` and `apps/frontend/messages/en.json` — flat/lightly namespaced JSON.

### `<html lang>` must be dynamic
`layout.tsx` currently hardcodes `lang="en"`. Must be replaced with the server-resolved locale value.

### Metadata migration
`layout.tsx` uses a static `export const metadata` today. Must migrate to `generateMetadata()` to support locale-aware title and description.

### Middleware coordination risk
Introducing `middleware.ts` may conflict with Kinde auth routes (`/api/auth/*`). Kinde routes must be excluded from locale middleware via the `matcher` config. Open question for the architect.

## Out of Scope (confirmed)
- URL-based locale routing
- Backend/DB storage of user locale preference
- More than two languages in this phase
- Translation of dynamic database content (route names, descriptions)
- RTL layout support
- Locale-aware formatting (dates, numbers, currency)
