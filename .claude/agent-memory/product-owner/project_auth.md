---
name: "Pillyway auth decisions"
description: "Auth provider choice, protected routes, and header login/logout UX decisions — context for auth-related tickets"
type: project
---

Auth provider is **Kinde**. Use Kinde's hosted UI and SDK wherever available — no custom login/registration forms.

**Why:** Keeps auth surface minimal and secure; avoids building and maintaining custom credential flows. Stakeholder constraint.

**How to apply:** All auth tickets must assume Kinde SDK on the frontend and Kinde-issued JWT verification on the backend. Do not scope custom login forms.

## Route access rules
- Public (no auth required): `/` (home), `/caminos`
- Protected (login required): `/caminos/new` — redirect to Kinde login if unauthenticated

## Header auth UX
- Unauthenticated: header shows a "Login" button
- Authenticated: header shows a user icon (avatar or icon, no text label)
- Login button triggers Kinde hosted login/registration flow

## Backend auth
- NestJS backend verifies Kinde-issued JWTs on protected endpoints
- Passport-jwt is already installed; Kinde JWKS URI will be used as the key source
- `passport-jwt` + `@nestjs/passport` are already in the backend's package.json

## Role mapping
- All new Kinde users are assigned the Reviewer role by default (stored in Kinde claims or synced to Supabase on first login)
- Route Editor role is assigned manually via Kinde dashboard or admin tooling (out of scope for this ticket)
