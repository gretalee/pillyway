---
name: Auth Strategy — Kinde JWT (AUTH-001)
description: Kinde RS256 JWT verification implemented via jwks-rsa + passport-jwt; do not use @kinde-oss/kinde-auth-node
type: project
---

Kinde JWT authentication implemented in `app/backend/src/auth/` using `jwks-rsa` v3 + `passport-jwt`. 

**Why:** `@kinde-oss/kinde-auth-node` is Express-specific and archived; the project uses NestJS.

**How to apply:** Always use the `KindeJwtStrategy` / `JwtAuthGuard` / `RolesGuard` pattern already in place. Add `jwks-rsa` named import (`passportJwtSecret`) — not the default import — to avoid nodenext resolution issues. Kinde roles arrive as `[{ id, key, name }]` in the JWT payload under `request.user.roles`; check `role.key` for values like `reviewer` and `route_editor`.
