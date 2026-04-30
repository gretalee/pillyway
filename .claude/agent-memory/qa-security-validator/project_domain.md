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

## Write Permission Matrix (updated for PILLY-CAM-001)
| Action | Guest | Reviewer | Route Editor | Pilgrim |
|---|---|---|---|---|
| Read routes / stages / accommodations | ✓ | ✓ | ✓ | ✓ |
| Create / edit review | ✗ | ✓ | ✓ | ? |
| Create / edit route, stage, accommodation | ✗ | ✗ | ✓ | ✗ |
| Create camino | ✗ | ✗ | ✗ | ✓ |

## Known security posture observations (backend)
- `app.enableCors()` called without origin allowlist in `main.ts` — pre-existing High severity finding; must be remediated before camino feature ships
- `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` is active globally — mass-assignment protection is in place provided DTOs are correctly annotated
- `SupabaseService` uses service-role key — all DB access bypasses RLS; authorization must be enforced in application code, not DB policies
