---
ticket: PILLY-I18N-001
status: ready-for-development
created: 2026-04-29
author: product-owner agent
---

# Allow Users to Switch the App Language (DE / EN)

**Title**: Allow users to switch the app language between German and English

**Type**: Feature

**Priority**: High — i18n is a foundational infrastructure concern. All subsequent UI copy must flow through the translation system, so this must land before any significant content work. German is the default language, meaning the current hardcoded English strings already represent a gap.

---

## User Personas

| Persona | Role | Relevance |
|---|---|---|
| Pilgrim (browser) | Guest / unauthenticated | Uses the app to discover routes; expects the UI in their native language without creating an account |
| Pilgrim (reviewer) | Reviewer (authenticated) | Writes reviews; language preference should persist across sessions |
| Route Editor | Route Editor (authenticated) | Manages route data; works in their preferred language |

All three roles are affected equally — the language switch is a global, cross-cutting concern.

---

## User Story

As any visitor or authenticated user of Pillyway, I want to switch the app language between German and English so that I can use the app comfortably in my preferred language without leaving the current page or losing my context.

---

## Context and Background

The current codebase has hardcoded English strings in several components (`Header.tsx`, `UserMenu.tsx`, `layout.tsx` metadata). No i18n library is installed. The project convention (`CLAUDE.md`) already mandates "No hardcoded strings — use i18n keys", so this feature both satisfies a pending architectural requirement and delivers direct user value.

German is the target primary market and must be the fallback language when no preference can be determined. The language switcher lives in the Header alongside the existing user-menu icon, to the left of that icon.

The app has no `next.config.ts` i18n routing block today, and uses the Next.js 16 App Router. The chosen i18n approach must be compatible with the App Router's server-component model (no `pages/` directory exists).

---

## Functional Requirements

1. **Language switcher component** — A compact toggle or dropdown in the Header renders two options: "DE" and "EN". It is visible to both authenticated and unauthenticated users on every page.

2. **Placement** — The switcher is positioned to the left of the user icon (or the "Log in" link when unauthenticated), inside the existing `flex items-center gap-4` container in `Header.tsx`.

3. **Initial language detection** — On the first visit (no stored preference), the app determines the language using the following priority order:
   a. Browser language (`navigator.language` / `Accept-Language` header) — first match against `['de', 'en']`
   b. OS language (surfaced via `navigator.languages` array, checked in order)
   c. Fallback: German (`de`)

4. **Locale persistence** — The selected language is stored in a Zustand slice (`useLocaleStore`) and simultaneously written to a `pillyway-locale` cookie (max-age 1 year, `SameSite=Lax`, no `Secure` restriction required for this value). On subsequent visits the cookie value takes precedence over browser detection.

5. **Translation coverage** — All user-visible strings across the app are translated via i18n keys. At minimum the following strings must be covered in the initial implementation:
   - Header: "Log in", "Backoffice", `aria-label="Pillyway home"`, `aria-label="Log in"`, `aria-label="User menu"`, `aria-label="Account navigation"`
   - UserMenu: "Log out", user first-name greeting section aria description
   - Page metadata (`<title>`, `<meta name="description">`) in `layout.tsx`
   - Any other strings that exist in the codebase at implementation time

6. **Real-time switch** — Changing the language in the switcher immediately re-renders all translated strings on the page without a full page reload.

7. **`lang` attribute on `<html>`** — The `<html lang="...">` attribute in `layout.tsx` must reflect the active locale (`"de"` or `"en"`). Currently hardcoded to `"en"`.

8. **No URL-based locale routing** — Do NOT implement `next.config.ts` locale prefixes (`/de/...`, `/en/...`). Locale is stored client-side (cookie + Zustand) to avoid URL churn and to keep the routing surface unchanged.

9. **Switcher accessibility** — The language switcher must be keyboard-navigable, have a visible focus ring, and carry an ARIA label (e.g., `aria-label="Select language"`) that is itself translated.

10. **Switcher visual design** — Use shadcn/ui primitives (e.g., `ToggleGroup` or a minimal `Select`) styled to be visually compact so it does not disrupt the existing header layout at any viewport width.

---

## Non-Functional Requirements

- **Bundle impact**: The i18n library and translation files must not meaningfully inflate the initial JS bundle. Translation namespaces must be tree-shakeable or lazily loaded.
- **SSR compatibility**: The locale cookie must be readable server-side (in Server Components and `layout.tsx`) so that the `<html lang>` attribute and any server-rendered translated strings are correct on the first HTTP response — no flash of wrong language.
- **Accessibility**: WCAG 2.1 AA. Language switcher must be operable via keyboard; screen readers must announce the current language.
- **Performance**: Language switch must complete within one render cycle; no debounce or async latency is acceptable for in-memory translation lookups.
- **TypeScript**: All i18n key lookups must be fully typed. Missing keys must be caught at compile time, not runtime.

---

## Technical Notes

### Recommended i18n Library

**`next-intl`** is the recommended choice for this project.

Rationale:
- Native, first-class support for Next.js App Router Server Components and Client Components without layout wrappers or provider gymnastics
- Supports cookie-based locale detection without URL-based routing (via `next-intl`'s "pathname-less" / navigation-free setup)
- Typed message keys out of the box (TypeScript module augmentation)
- Well-maintained, actively aligned with Next.js 16 release cadence
- Compact bundle footprint; translations are loaded per locale, not all at once

`react-i18next` + `i18next` is the alternative but requires more manual wiring for Server Components and has weaker TypeScript ergonomics in the App Router context.

### Locale Detection Strategy (Implementation Sketch)

```
1. middleware.ts (Next.js Middleware)
   - Read `pillyway-locale` cookie on every request
   - If absent: parse `Accept-Language` header, match against ['de', 'en'], fallback 'de'
   - Write resolved locale to request headers (x-locale) so Server Components can read it
   - Do NOT redirect — locale is never reflected in the URL

2. layout.tsx (Server Component)
   - Read `x-locale` from request headers (via next/headers)
   - Pass locale to next-intl's <NextIntlClientProvider messages={messages} locale={locale}>
   - Set <html lang={locale}>

3. useLocaleStore (Zustand, client-side)
   - Shape: { locale: 'de' | 'en', setLocale: (l) => void }
   - setLocale: updates Zustand state AND writes `pillyway-locale` cookie
   - Initialized from the locale value passed down from the Server Component (via a
     LocaleStoreInitializer pattern, mirroring the existing UserStoreInitializer)

4. LanguageSwitcher component (Client Component)
   - Reads locale from useLocaleStore
   - On toggle: calls setLocale → cookie written → triggers router.refresh() so the
     Server Component re-renders with the new locale from cookie
```

### Zustand Store Shape

```typescript
// store/locale-store.ts
type Locale = 'de' | 'en';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: 'de',           // overwritten by LocaleStoreInitializer on mount
  setLocale: (locale) => {
    set({ locale });
    document.cookie = `pillyway-locale=${locale};max-age=31536000;path=/;SameSite=Lax`;
  },
}));
```

### Header Placement

The switcher must be inserted into the `flex items-center gap-4` container in `Header.tsx`, immediately before the `<nav aria-label="Account navigation">` element:

```tsx
<div className="flex items-center gap-4">
  {/* ...existing role debug span and backoffice link... */}
  <LanguageSwitcher />          {/* NEW — left of user icon */}
  <nav aria-label="...">        {/* existing */}
    ...
  </nav>
</div>
```

`LanguageSwitcher` must be a Client Component (`"use client"`) since it reads from Zustand and handles interaction.

### Translation File Structure

```
apps/frontend/
  messages/
    de.json   ← default / primary language
    en.json
```

Each file is a flat or lightly namespaced JSON object:

```json
{
  "header": {
    "home_label": "Pillyway",
    "login": "Anmelden",
    "backoffice": "Backoffice",
    "aria_home": "Pillyway Startseite",
    "aria_login": "Anmelden",
    "aria_user_menu": "Benutzermenü",
    "aria_account_nav": "Kontonavigation",
    "aria_language_switcher": "Sprache auswählen"
  },
  "user_menu": {
    "logout": "Abmelden"
  },
  "meta": {
    "title": "Pillyway",
    "description": "Plane deine Pilgerreise."
  }
}
```

### `<html lang>` Update

`layout.tsx` currently hardcodes `lang="en"`. This must become dynamic. Since `layout.tsx` is a Server Component, it can read the locale from the middleware-injected header or the cookie directly via `next/headers`, and set `lang={locale}` accordingly.

---

## Acceptance Criteria

- [ ] **AC-1**: Given a user with no stored locale preference and a browser set to German (`de`), when they load the app for the first time, then the UI renders in German and the `<html lang>` attribute is `"de"`.
- [ ] **AC-2**: Given a user with no stored locale preference and a browser set to a language other than German or English (e.g., French), when they load the app, then the UI renders in German (fallback).
- [ ] **AC-3**: Given a user who previously selected English and has the `pillyway-locale=en` cookie, when they load the app, then the UI renders in English regardless of the current browser language.
- [ ] **AC-4**: Given a user viewing the app, when they click the language switcher and select the other language, then all visible UI strings update immediately without a full page navigation.
- [ ] **AC-5**: Given a user who switches to English, when they navigate to another page, then the language remains English (cookie is preserved).
- [ ] **AC-6**: The language switcher is visible in the Header on all pages, to the left of the user icon (or "Log in" link), for both authenticated and unauthenticated users.
- [ ] **AC-7**: The `<html lang>` attribute matches the active locale on every page load (verified via DOM inspection or E2E assertion).
- [ ] **AC-8**: No hardcoded user-visible English or German strings remain in `Header.tsx`, `UserMenu.tsx`, or `layout.tsx` metadata — all are resolved via i18n keys.
- [ ] **AC-9**: The language switcher is keyboard-navigable (Tab to focus, Enter/Space to activate) and has a visible focus indicator.
- [ ] **AC-10**: The language switcher carries an `aria-label` that is itself translated (not hardcoded).
- [ ] **AC-11**: TypeScript compilation passes with no errors after all i18n key lookups are typed. Missing translation keys are flagged at compile time.
- [ ] **AC-12**: Vitest unit tests cover: locale detection logic (browser language parsing + fallback), `useLocaleStore.setLocale` (state update + cookie write), and `LanguageSwitcher` rendering in both locales.

---

## Edge Cases and Error Handling

| Scenario | Expected Behaviour |
|---|---|
| `navigator.language` is unavailable (e.g., server-side or old browser) | Fall back to `Accept-Language` header in middleware; if that is also absent, use `'de'` |
| Cookie is set to an unrecognised value (e.g., `pillyway-locale=fr`) | Treat as absent; re-run detection logic, default to `'de'` |
| A translation key is missing in the active locale's JSON | `next-intl` logs a warning in development; in production, falls back to the key string to avoid blank UI |
| User agent sends `Accept-Language: *` | Treat as no language preference; fall back to `'de'` |
| Rapid successive clicks on the switcher | Debounce is NOT required; each click writes the cookie and triggers `router.refresh()` — the UI is idempotent |

---

## Out of Scope

- URL-based locale routing (e.g., `/de/caminos`, `/en/caminos`) — decided against to keep URLs stable
- Locale stored in the authenticated user's profile on the backend (Supabase / Kinde) — locale is client-side only in this iteration
- More than two languages (DE and EN) — additional languages are a Phase 2 backlog item
- Translation of dynamic content from the database (route names, stage descriptions) — only static UI strings are in scope
- Right-to-left (RTL) layout support
- Pluralisation rules beyond what `next-intl` provides out of the box
- Locale-aware number, date, or currency formatting (separate ticket if needed)
- An admin UI for managing translations

---

## Dependencies

- `next-intl` must be added to `apps/frontend/package.json` (no backend changes required)
- `apps/frontend/middleware.ts` must be created (currently does not exist) — this may interact with any future Kinde auth middleware; coordination required
- All existing hardcoded strings in `Header.tsx`, `UserMenu.tsx`, and `layout.tsx` must be migrated in this same ticket (no partial migration)

---

## Open Questions

1. **Middleware coordination with Kinde**: Kinde auth uses `/api/auth/*` routes. If a `middleware.ts` is introduced for locale detection, the Kinde handler must be excluded from locale middleware processing. Confirm with the architect whether a combined middleware or a matcher-based exclusion is preferred.
2. **`next-intl` version**: Confirm the latest stable `next-intl` release is compatible with Next.js 16.2.4 before installing. Check `node_modules/next/dist/docs/` or the official docs as noted in `CLAUDE.md`.
3. **Server-side locale for metadata**: `layout.tsx` exports a static `metadata` object today. Dynamic per-locale metadata requires `generateMetadata()` — confirm this pattern is acceptable given the App Router's caching behaviour.

---

## Design / UX Notes

- The switcher should display as two short uppercase labels: **"DE"** and **"EN"**, not full-length language names, to stay compact in the header.
- The active locale label should have a visually distinct state (e.g., `font-semibold` or a subtle underline) so the current selection is unambiguous at a glance.
- Use shadcn/ui `ToggleGroup` (two items) as the base component if it fits the existing design system; otherwise a minimal custom button pair styled with CVA variants is acceptable.
- The switcher must not break the header layout on small viewports (mobile). If space is constrained, consider abbreviating to flag icons or a globe icon with a dropdown, but text labels are preferred for accessibility.

---

## Definition of Done

- [ ] `next-intl` is installed and configured for the Next.js App Router without URL-based routing
- [ ] `apps/frontend/middleware.ts` is created with locale detection logic (cookie → Accept-Language → default `'de'`) and excludes Kinde auth routes
- [ ] `apps/frontend/messages/de.json` and `apps/frontend/messages/en.json` exist and contain all required keys
- [ ] `useLocaleStore` Zustand slice is implemented with `locale` state and `setLocale` action (cookie write included)
- [ ] `LocaleStoreInitializer` component initialises the Zustand store from the server-resolved locale (mirrors the `UserStoreInitializer` pattern)
- [ ] `LanguageSwitcher` Client Component is implemented, placed correctly in `Header.tsx`, and styled with shadcn/ui primitives
- [ ] `<html lang>` in `layout.tsx` is dynamic and reflects the resolved locale
- [ ] `layout.tsx` metadata is migrated to `generateMetadata()` and returns locale-appropriate `title` and `description`
- [ ] All hardcoded strings in `Header.tsx`, `UserMenu.tsx`, and `layout.tsx` are replaced with `next-intl` `useTranslations` / `getTranslations` calls
- [ ] TypeScript strict mode passes with no errors; i18n keys are typed
- [ ] Vitest unit tests written and passing for: locale detection, `useLocaleStore`, and `LanguageSwitcher`
- [ ] At least one Playwright E2E test verifies: default language on first load, language switch persists on navigation, `<html lang>` reflects active locale
- [ ] Accessibility: switcher is keyboard-navigable, has ARIA label, meets WCAG 2.1 AA contrast
- [ ] Reviewed and approved by human Software Architect or Senior Developer
- [ ] Deployed to staging and smoke-tested

---

## Architect Review

**Reviewed by**: software-architect-lead
**Date**: 2026-04-29
**Status**: Approved with constraints — see notes below

---

### Open Question Resolutions

#### OQ-1: Middleware coordination with Kinde auth

No `middleware.ts` exists in the codebase today. Kinde auth is handled entirely via the App Router catch-all API route at `app/api/auth/[kindeAuth]/route.ts`. Kinde's Next.js SDK (v2.12.1, installed) does **not** require a middleware entry — it operates at the route-handler level only.

The locale middleware must therefore be the **sole** middleware, with a matcher that skips all API routes, static assets, and Next.js internals:

```typescript
// apps/frontend/middleware.ts
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - /api/* routes (Kinde auth lives at /api/auth/*)
     *   - /_next/static, /_next/image (Next.js internals)
     *   - /favicon.ico, /robots.txt, /sitemap.xml (static files at root)
     *   - Files with an extension (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
  ],
};
```

This is a single-middleware design. No chaining required. There is no Kinde middleware to coordinate with — the concern in the ticket was unfounded given the actual SDK version in use.

#### OQ-2: next-intl version compatibility with Next.js 16.2.4

Confirmed compatible. The `next-intl` package.json on GitHub main declares:

```json
"peerDependencies": {
  "next": "^12.0.0 || ^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0",
  "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || >=19.0.0-rc <19.0.0 || ^19.0.0"
}
```

The project runs **Next.js 16.2.4** and **React 19.2.4**, both within the declared peer ranges.

**Version to install**: `next-intl@^3.26.0` (latest stable 3.x) is the conservative choice if caution is needed. However, `next-intl@^4.x` is the actively maintained line as of early 2026, includes ESM-only build (aligned with this project's `"type": "module"` in `package.json`), and GDPR-compliant cookie handling. **Recommendation: install `next-intl@^4.0.0`** — the ESM-only build matches the project's `"type": "module"` declaration.

Key 4.x changes relevant to this feature:
- `NextIntlClientProvider` inherits messages and formats automatically from `i18n/request.ts` — no `messages` prop needed in `layout.tsx`
- Type augmentation consolidated under `AppConfig` interface (cleaner typed keys)
- GDPR session-cookie behaviour by default for locale cookies (Kinde does not conflict here)

#### OQ-3: `generateMetadata()` for per-locale metadata

Confirmed as the correct pattern. The current `layout.tsx` exports a static `metadata` object — this is incompatible with dynamic locale resolution. Replacing it with `async function generateMetadata()` that calls `getTranslations('meta')` is the established App Router pattern and carries no caching caveats for a root layout (root layouts are not segment-cached).

Caveat: `generateMetadata()` in the root layout runs on every request (no ISR caching applies to metadata at the layout level). This is acceptable given the lightweight nature of the locale+translation lookup. Do not add `export const revalidate` to the root layout to avoid unintended side effects on page-level caching.

---

### Architecture Decision Record (ADR-I18N-001)

**Decision**: Adopt `next-intl` v4.x for i18n, cookie-only locale strategy, no URL routing, single middleware

#### Library Choice

Install `next-intl@^4.0.0`. Pin to `^4.0.0` (not `latest`) in `package.json` to allow patch/minor updates while guarding against a hypothetical v5 breaking change. Do not install `react-i18next` — it requires manual provider wiring for Server Components and has weaker TypeScript ergonomics.

#### Middleware Design

Create `apps/frontend/middleware.ts` as the sole middleware. It does three things:

1. Reads the `pillyway-locale` cookie
2. Falls back to `Accept-Language` header negotiation against `['de', 'en']`
3. Writes the resolved locale to a forwarded request header `x-pillyway-locale`

The middleware does **not** redirect. It does **not** call any Kinde SDK function. The matcher shown in OQ-1 above is the exact matcher to use.

#### `i18n/request.ts` (next-intl server config)

Create `apps/frontend/i18n/request.ts`. This is the file next-intl's plugin reads at build-time registration:

```typescript
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const SUPPORTED_LOCALES = ['de', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'de';

function resolveLocale(raw: string | undefined): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const normalised = raw.toLowerCase().split('-')[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(normalised)
    ? (normalised as Locale)
    : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  // Locale was resolved in middleware and forwarded as a header.
  // Cookie is re-read here as a defensive fallback (e.g., direct
  // Server Action calls that bypass middleware).
  const headerStore = await headers();
  const cookieStore = await cookies();

  const fromHeader = headerStore.get('x-pillyway-locale') ?? undefined;
  const fromCookie = cookieStore.get('pillyway-locale')?.value ?? undefined;
  const locale = resolveLocale(fromHeader ?? fromCookie);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

#### Server Component → Client Component Locale Hydration Flow

```
HTTP Request
    │
    ▼
middleware.ts
    ├─ reads cookie: pillyway-locale
    ├─ falls back: Accept-Language → 'de'
    └─ writes header: x-pillyway-locale = <resolved>
    │
    ▼
i18n/request.ts  (next-intl internal, runs per request in server context)
    ├─ reads x-pillyway-locale header
    ├─ loads messages/<locale>.json
    └─ provides { locale, messages } to next-intl's request context
    │
    ▼
layout.tsx  (async Server Component)
    ├─ calls getTranslations('meta') → locale-aware title/description
    ├─ sets <html lang={locale}>            (reads locale from next-intl context)
    └─ renders <NextIntlClientProvider>     (no props needed in v4 — context
         │                                   populated from i18n/request.ts)
         ▼
      Providers (Client Component boundary)
         ├─ QueryClientProvider
         ├─ LocaleStoreInitializer  ← NEW: reads locale from next-intl,
         │    (useEffect → useLocaleStore.setState)   syncs to Zustand
         └─ UserStoreInitializer
         │
         ▼
      Client Components (LanguageSwitcher, UserMenu, …)
         └─ useTranslations() reads from NextIntlClientProvider context
         └─ useLocaleStore()  reads locale for switcher active state
```

#### `NextIntlClientProvider` Mounting

In next-intl v4, `NextIntlClientProvider` requires **no props** when placed in the root layout. It automatically inherits `locale` and `messages` from the `i18n/request.ts` request config. Mount it directly wrapping `{children}` inside the `<body>`, wrapping or inside `Providers`:

Option A (simpler — preferred): wrap `<Providers>` with `<NextIntlClientProvider>` in `layout.tsx`:

```tsx
// layout.tsx (Server Component)
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';

export default async function RootLayout({ children }) {
  // ...Kinde session logic (unchanged)...
  const locale = await getLocale();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Header user={authUser} />
        <NextIntlClientProvider>
          <Providers user={authUser}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`getLocale()` is the next-intl server helper that reads from the request config — no manual header parsing needed in `layout.tsx` itself.

#### `LocaleStoreInitializer` Pattern

Mirror `UserStoreInitializer` exactly:

```tsx
// providers/LocaleStoreInitializer.tsx
'use client';
import { useEffect } from 'react';
import { useLocaleStore } from '@/store/locale-store';
import type { Locale } from '@/i18n/request';

export function LocaleStoreInitializer({ locale }: { locale: Locale }) {
  useEffect(() => {
    useLocaleStore.setState({ locale });
  }, [locale]);
  return null;
}
```

`Providers` receives `locale: Locale` as a prop (passed from `layout.tsx`) and renders `<LocaleStoreInitializer locale={locale} />` alongside `<UserStoreInitializer>`. The `useEffect` here is justified — it is an imperative synchronisation of external server-resolved state into a client store, which is exactly the documented exception in CLAUDE.md.

#### Translation File Structure

Confirmed as proposed. Path: `apps/frontend/messages/de.json` and `apps/frontend/messages/en.json`. Use the namespaced structure from the ticket as-is. No changes required to the proposed key layout.

#### TypeScript Typed Keys Setup

After installing next-intl, add `apps/frontend/global.d.ts` (or extend existing):

```typescript
import de from './messages/de.json';

declare module 'next-intl' {
  interface AppConfig {
    messages: typeof de;
    locale: 'de' | 'en';
  }
}
```

This provides compile-time exhaustiveness for all translation key lookups. Missing keys become TypeScript errors.

#### `next.config.ts` Change

Wrap the existing config with the next-intl plugin:

```typescript
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(import.meta.dirname),
};

export default withNextIntl(nextConfig);
```

Note: `__dirname` is not available in ESM (`"type": "module"`). The existing `next.config.ts` currently uses `__dirname` — this will break in ESM context. Replace with `import.meta.dirname` (Node 20+, which this project satisfies per `engines: { node: ">=24.14.0" }`).

---

### Risks and Constraints for Implementing Agents

1. **`__dirname` in `next.config.ts` is broken under ESM** — `package.json` declares `"type": "module"`. The current `path.resolve(__dirname)` call in `next.config.ts` will throw at build time. Must be fixed as part of this ticket by replacing `__dirname` with `import.meta.dirname`. This is a pre-existing bug surfaced by adding the next-intl plugin.

2. **`UserStoreInitializer` uses `useEffect` for store sync** — the same pattern is required for `LocaleStoreInitializer`. CLAUDE.md prohibits gratuitous `useEffect` use, but explicitly this is the approved exception for external state hydration. Do not attempt to replace it with Zustand's `getState()` call or an initializer ref pattern — the `useEffect` here is intentional and mirrors the established codebase convention.

3. **`router.refresh()` triggers a full Server Component re-render** — this is required after a locale switch so that `i18n/request.ts` re-runs and picks up the new cookie. This is the correct and only mechanism when not using URL-based routing. The re-render will update the `<html lang>` attribute and all Server Component translations. Client Component strings update immediately via the Zustand store. There will be a brief flash (~100ms on local) while the server re-renders — this is acceptable and unavoidable with this architecture.

4. **Dynamic import of message JSON in `i18n/request.ts`** — `import(`../messages/${locale}.json`)` is a dynamic expression. Webpack (this project runs `--webpack`) may not statically bundle these. Add both locales to the dynamic import to help the bundler:

   ```typescript
   const messages = locale === 'de'
     ? (await import('../messages/de.json')).default
     : (await import('../messages/en.json')).default;
   ```

   This ensures both files are included in the build output without relying on glob/dynamic-expression bundling.

5. **ESM-only build of next-intl v4** — aligns with the project's `"type": "module"` declaration. However, Vitest config may need adjustment if it currently uses CJS interop. Verify `vitest.config.ts` uses `environment: 'jsdom'` and has no `commonjs()` plugin that could conflict.

6. **Cookie `Secure` flag** — the ticket deliberately omits `Secure` from the `pillyway-locale` cookie. This is acceptable for a non-sensitive preference cookie. No change needed.

7. **`generateMetadata()` cannot use `useTranslations()`** — `useTranslations` is a Client Component hook. Inside `generateMetadata()`, use `getTranslations()` (the async server-side equivalent from `next-intl/server`).

8. **`Header.tsx` is currently a Server Component** — it does not have `"use client"`. It receives `user` as a prop from `layout.tsx`. The `LanguageSwitcher` must be a separate Client Component imported into `Header.tsx`. Do not convert `Header.tsx` itself to a Client Component — that would pull the Kinde user data call into the client bundle.

---

## QA &amp; Security Checklist

To be validated by the `qa-security-validator` once implementation is complete.

### 1. Cookie Attributes

- [ ] `pillyway-locale` cookie is written with `path=/` — confirms site-wide scope, not scoped to the current path segment
- [ ] Cookie carries `SameSite=Lax` — prevents the value being sent on cross-site requests (CSRF surface reduction)
- [ ] Cookie does **not** carry the `Secure` flag — intentional; the value is non-sensitive and Secure would break local HTTP development (confirmed in ticket FR-4 and architect note 6)
- [ ] Cookie does **not** carry `HttpOnly` — intentional; the client JS (setLocale) must be able to write it
- [ ] Cookie `max-age` is 31536000 (one year) — preference must survive browser restarts per AC-5
- [ ] Cookie name is exactly `pillyway-locale` — middleware reads this exact name; any deviation causes detection to fall through to the Accept-Language fallback on the next load

### 2. Input Validation — Locale Allowlist

- [ ] `resolveLocale()` (in `i18n/request.ts` or a dedicated helper) validates the raw value against the allowlist `['de', 'en']` **before** it is used anywhere — an unrecognised value must fall back to `'de'`, not be passed through
- [ ] The `pillyway-locale` cookie value is validated on the **server side** in `i18n/request.ts` — client-side validation alone is insufficient because a user can manually set any cookie value
- [ ] `setLocale` in `useLocaleStore` accepts only `'de' | 'en'` at the TypeScript type level — the type definition must not widen to `string`
- [ ] Passing an arbitrary string to `resolveLocale()` (e.g., `"fr"`, `"<script>"`, `"../../../../etc"`) returns `'de'` without throwing

### 3. Reflection / Injection Risk

- [ ] The locale string (`'de'` or `'en'`) is only ever used as:
  - a value in `<html lang={locale}>` — safe; no script context
  - a key for JSON message file selection — safe; validated against allowlist before the dynamic import
  - a Zustand state value — safe; never rendered directly into DOM
- [ ] Translation values in `de.json` / `en.json` are static, developer-authored strings — they are **not** derived from user input and therefore do not need sanitisation before rendering
- [ ] No translation value is rendered via `dangerouslySetInnerHTML` — `next-intl` renders via React children by default; confirm no manual `dangerouslySetInnerHTML` usage is introduced during string migration
- [ ] The `x-pillyway-locale` request header written by middleware is read only in `i18n/request.ts` (server-side) — it is never reflected back into an HTTP response header or rendered to the page directly

### 4. Sensitive Data in Translation Files

- [ ] `de.json` and `en.json` contain only UI-facing strings — no API keys, secrets, internal route paths, or personally identifiable information
- [ ] Translation files are committed to the repository — confirm they contain nothing that should be kept out of source control
- [ ] No backend endpoint URLs, Supabase project refs, or Kinde domain values appear in translation files (those belong in environment variables)

### 5. Middleware Security Surface

- [ ] The middleware matcher excludes `/api/*` — Kinde auth routes at `/api/auth/[kindeAuth]` must not be processed by locale middleware
- [ ] The middleware matcher excludes `/_next/static`, `/_next/image`, and files with extensions — static assets must not incur locale detection overhead
- [ ] Middleware does **not** call any Kinde SDK function — locale detection is fully independent of authentication
- [ ] Middleware does **not** redirect the user — locale is never encoded in the URL; any redirect logic would be a regression

### 6. Build-Time Type Safety

- [ ] `global.d.ts` declares `AppConfig` with `messages: typeof de` — missing translation keys are TypeScript errors, not silent runtime omissions
- [ ] `Locale` type is `'de' | 'en'` (a union literal), not `string` — prevents arbitrary strings entering the locale pipeline at compile time
- [ ] `yarn tsc --noEmit` passes with zero errors after all i18n key lookups are introduced
