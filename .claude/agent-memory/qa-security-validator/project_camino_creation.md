---
name: "Camino creation + update/delete features (PILLY-CAM-001/002) — security patterns and test anchors"
description: "Key security risks, test file locations, and open questions for the camino creation, update, and delete features"
type: project
---

PILLY-CAM-001 introduces camino creation for users with the `pilgrim` Kinde role. PILLY-CAM-002 adds view, update, and delete. Test criteria are written pre-implementation at `.claude/qa/camino-creation-test-criteria.md`.

**Why:** The feature has several compounding risk surfaces: a new role, a mass-assignment risk on `verified`/`created_by`, a race condition on the `(name, country)` unique constraint, and an unbounded ILIKE search endpoint.

**How to apply:** When reviewing any implementation PR for this feature, load the test criteria doc and verify all DoD gates are satisfied before approving.

## Critical security risks to verify at implementation review

1. **Guard order** — `@UseGuards(JwtAuthGuard, RolesGuard)` must be in this exact order. Reversed order causes `RolesGuard` to read `request.user` before passport populates it, silently letting all requests through.
2. **`verified` field stripping** — must not be present in the `CreateCaminoDto` or `UpdateCaminoDto`. Whitelist mode strips it only if the DTO omits it entirely. If it appears as `@IsOptional()` it is NOT stripped.
3. **`created_by` source** — must be injected from `req.user.sub` inside the service, never from the DTO. Any DTO field named `createdBy` or `created_by` is a mass-assignment hole.
4. **ILIKE parameterization** — Prisma uses parameterized queries; confirm no raw `$queryRaw` or template string SQL is used in the search path.
5. **Result cap at DB level** — `.limit(5)` must be in the Prisma query chain, not a JS-side `.slice()`.
6. **Transaction atomicity** — PILLY-CAM-002 resolved this: Prisma `$transaction` is used for waypoint replacement in update. No compensating deletes needed.
7. **CORS** — `app.enableCors()` in `main.ts` now reads `FRONTEND_URL` from ConfigService and scopes the origin. Pre-existing High finding is RESOLVED.
8. **Ownership authorization** — PATCH and DELETE check `isPilgrim || isOwner` BEFORE any mutation. userId comes from `req.user.sub`. Correct.
9. **TOCTOU on update** — Name conflict check (step 3) and waypoint transaction (step 4) are separate DB round-trips. A concurrent rename to the same name could slip through in extreme cases. Low practical risk because of the DB-level unique constraint as a backstop.
10. **`updatedAt` not auto-managed** — The `Camino` schema does not use `@updatedAt`. The service sets `updatedAt: new Date()` manually. Risk: if waypoint-only update path completes `$transaction` but then `camino.update` fails, the camino row will have stale `updatedAt`. Acceptable for now; flag if atomicity becomes a requirement.
11. **`description` null-clearing via PATCH** — `UpdateCaminoDto.description` accepts `string | null`. `@IsString()` fires only when the value is a non-null string, and `@IsOptional()` skips it when absent. When `null` is sent, `@IsString()` runs and fails. This is a bug: sending `{ description: null }` returns a 400 instead of clearing the field.

## Authorization model for PATCH/DELETE (PILLY-CAM-002)
- No `RolesGuard` on PATCH/DELETE routes — service does the ownership/role check in-process.
- Service check: `isPilgrim (any camino) || isOwner (createdBy === userId)` — this is intentional and correct per requirements, but means ANY authenticated non-pilgrim who is the owner can mutate their camino.
- Frontend mirrors this check in `canEdit()` via Zustand `user-store`; this is UI-only and not a security boundary.

## Test file locations
- `apps/backend/src/caminos/caminos.service.spec.ts` — service unit tests (create + findById + update + delete)
- `apps/backend/src/camino-points/camino-points.service.spec.ts` — search service unit tests
- `apps/frontend/app/caminos/components/CreateCaminoForm.test.tsx` — form component tests
- `apps/e2e/tests/camino-creation.spec.ts` — E2E happy paths and auth gates

## Open questions (updated 2026-05-05)
- `description: null` PATCH body fails validation — see bug finding above. Must be resolved before `null` clearing works.
- Missing test for description-null clear path in both service spec and E2E.
- Missing unit test for `findById` missing from `update` test suite (update happy path relies on internal `findById` call — second `findUnique` mock is used but not explicitly tested for correctness).
- `CaminoPointOrder` has `@@id([caminoId, caminoPointId])` — this means a camino can only visit each point once. Update `$transaction` deletes all orders then re-inserts; if the same point appears twice in payload the second insert will hit this PK constraint and throw a P2002 that is swallowed as InternalServerErrorException (not BadRequestException). Consider adding a duplicate-point-ID check in the update path identical to the new-point-def duplicate check.
