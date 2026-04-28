---
name: "Pillyway auth architecture"
description: "Kinde auth setup: SDK version, key exports, guarded routes, and component split pattern"
type: project
---

Auth is handled by Kinde via `@kinde-oss/kinde-auth-nextjs` ^2.4.13.

**Why:** Kinde was chosen over Clerk to keep auth hosted and reduce client-side complexity. Session is stored in HTTP-only cookies (SDK default).

**How to apply:** Always read auth state server-side using `getKindeServerSession()` from `@kinde-oss/kinde-auth-nextjs/server`. Never check auth state client-side to avoid flicker or FOUC.

## SDK exports used
- `handleAuth` from `@kinde-oss/kinde-auth-nextjs/server` — catch-all route handler at `app/api/auth/[kindeAuth]/route.ts`
- `getKindeServerSession` from `@kinde-oss/kinde-auth-nextjs/server` — server-side session (used in Header Server Component)
- `withAuth` from `@kinde-oss/kinde-auth-nextjs/middleware` — Next.js middleware for route guarding

## No KindeProvider needed
Kinde v2 App Router SDK does not require a client-side KindeProvider wrapper.

## Route protection
- `/caminos/new` — protected via middleware matcher, redirects to Kinde login with return URL preserved
- `/` and `/caminos` — public, not in matcher, no redirect

## Header component pattern
Header is a Server Component that reads auth state. The interactive user menu (Base UI `Menu.*`) is extracted into a Client Component `UserMenu.tsx` (`"use client"`) to keep interactivity without making the full header client-side.

## Env vars required (see .env.example)
KINDE_CLIENT_ID, KINDE_CLIENT_SECRET, KINDE_ISSUER_URL, KINDE_SITE_URL, KINDE_POST_LOGOUT_REDIRECT_URL, KINDE_POST_LOGIN_REDIRECT_URL
