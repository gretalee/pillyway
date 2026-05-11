---
name: "Pillyway domain model"
description: "What Pillyway is and its authorization model — critical context for security validation"
type: project
---

Pillyway is a pilgrimage route planning app. CLAUDE.md documents three roles (Guest, Reviewer, Route Editor), but PILLY-CAM-001 introduces a fourth Kinde role: `pilgrim`. This role's key string in the JWT `roles` array is `pilgrim`. Role key is verified via `role.key` in `RolesGuard`. Confirm all role keys against the Kinde tenant before writing guard tests.

**Why:** Authorization bugs are the primary risk surface. Knowing the intended role model lets the validator catch privilege escalation issues — e.g., a Guest submitting a review, or a Reviewer editing a route.

**How to apply:** For every feature reviewed, verify that:
1. Unauthenticated requests cannot trigger write operations
2. Lower-privileged roles cannot access higher-privileged endpoints
3. Role assignment cannot be self-elevated by the user
4. `@UseGuards()` order is always `JwtAuthGuard` first, `RolesGuard` second — reversed order silently bypasses auth

## Write Permission Matrix (updated for PILLY-CAM-002)
| Action | Guest | Reviewer | Route Editor | Pilgrim | Authenticated Owner (non-pilgrim) |
|---|---|---|---|---|---|
| Read routes / stages / accommodations | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create / edit review | ✗ | ✓ | ✓ | ? | ? |
| Create / edit route, stage, accommodation | ✗ | ✗ | ✓ | ✗ | ✗ |
| Create camino | ✗ | ✗ | ✗ | ✓ | ✗ |
| Update/delete camino | ✗ | ✗ | ✗ | ✓ (any) | ✓ (own only) |

Note: PATCH/DELETE do not use RolesGuard. Authorization is enforced in-service via `isPilgrim || isOwner`.

## Known security posture observations (backend)
- `app.enableCors()` — RESOLVED in PILLY-CAM-002: now reads `FRONTEND_URL` from ConfigService, scopes origin to that value. Previous open-CORS finding is closed.
- `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` is active globally — mass-assignment protection is in place provided DTOs are correctly annotated
- Prisma is the ORM (not Supabase JS SDK); authorization must be enforced in application code since no RLS policies are relied upon
- `UpdateCaminoDto.description` is typed `string | null` but decorated with `@IsString()` — sending `null` triggers a class-validator failure (400) instead of clearing the field. Active bug as of PILLY-CAM-002.
