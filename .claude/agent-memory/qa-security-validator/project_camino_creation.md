---
name: "Camino creation feature (PILLY-CAM-001) — security patterns and test anchors"
description: "Key security risks, test file locations, and open questions for the camino creation feature"
type: project
---

PILLY-CAM-001 introduces camino creation for users with the `pilgrim` Kinde role. Test criteria are written pre-implementation at `.claude/qa/camino-creation-test-criteria.md`.

**Why:** The feature has several compounding risk surfaces: a new role, a mass-assignment risk on `verified`/`created_by`, a race condition on the `(name, country)` unique constraint, and an unbounded ILIKE search endpoint.

**How to apply:** When reviewing any implementation PR for this feature, load the test criteria doc and verify all DoD gates are satisfied before approving.

## Critical security risks to verify at implementation review

1. **Guard order** — `@UseGuards(JwtAuthGuard, RolesGuard)` must be in this exact order. Reversed order causes `RolesGuard` to read `request.user` before passport populates it, silently letting all requests through.
2. **`verified` field stripping** — must not be present in the `CreateCaminoDto`. Whitelist mode strips it only if the DTO omits it entirely. If it appears as `@IsOptional()` it is NOT stripped.
3. **`created_by` source** — must be injected from `req.user.sub` inside the service, never from the DTO. Any DTO field named `createdBy` or `created_by` is a mass-assignment hole.
4. **ILIKE parameterization** — Supabase JS SDK uses parameterized queries; confirm no raw `.rpc()` or template string SQL is used in the search path.
5. **Result cap at DB level** — `.limit(5)` must be in the Supabase query chain, not a JS-side `.slice()`. A JS slice prevents unbounded results in memory but still causes a full-table scan.
6. **Transaction atomicity** — Supabase JS SDK has no native transaction API. The architect must choose: DB-level RPC function OR compensating deletes. This must be resolved before CAM-BE-12/13 tests can be written.
7. **Open CORS** — `app.enableCors()` in `main.ts` has no origin filter. Flag on every review until remediated.

## Test file locations (pre-implementation stubs)
- `apps/backend/src/caminos/caminos.service.spec.ts` — service unit tests
- `apps/backend/src/camino-points/camino-points.service.spec.ts` — search service unit tests
- `apps/frontend/app/caminos/components/CreateCaminoForm.test.tsx` — form component tests
- `apps/e2e/tests/camino-creation.spec.ts` — E2E happy paths and auth gates

## Open questions (unresolved at 2026-04-30)
- Is `pilgrim` a new Kinde role or an alias for an existing role? Must be confirmed against Kinde tenant.
- Transaction strategy not yet decided by architect.
- `react-hook-form` is not in `apps/frontend/package.json` — must be added before frontend tests compile.
- Max waypoints per camino not defined — blocks SEC-17 test threshold.
