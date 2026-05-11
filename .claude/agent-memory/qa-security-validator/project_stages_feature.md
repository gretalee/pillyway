---
name: "Stage entity feature (PILLY-STG-001) — security patterns, test gaps, and implementation directives"
description: "Pre-implementation QA review findings for the Stage feature: @IsNumber NaN/Infinity risk, cross-Camino test gap, E2E isolation requirements"
type: project
---

PILLY-STG-001 introduces the Stage entity: a globally-shared row identified by `(startPointId, endPointId)`, created eagerly on Camino save, editable via PATCH by users with the `pilgrim` role (which transitively includes `owner` users in Kinde).

**Why:** The shared-stage architecture creates a non-obvious cross-Camino mutation surface, and the `@IsNumber` decorator has a known NaN/Infinity bypass that must be caught before implementation.

**How to apply:** During implementation PR review, verify all findings from the pre-implementation review at `.claude/reviews/qa-review-stages.md` are addressed.

## Critical findings to verify at implementation review

1. **`@IsNumber` NaN/Infinity bypass (Medium)** — `@IsNumber({ maxDecimalPlaces: 1 })` does not exclude `NaN` or `Infinity` by default. Both pass `typeof === 'number'` and `Infinity` passes `@Min(0.1)`. Must be `@IsNumber({ maxDecimalPlaces: 1, allowNaN: false, allowInfinity: false })` in `UpdateStageDto`.

2. **Cross-Camino PATCH visibility test missing (P1)** — The acceptance criteria require a test that PATCHing a stage via Camino A's URL produces a change visible when reading via Camino B. Neither the backend unit test plan nor the E2E plan covers this. Must be added.

3. **`camino-update-delete.spec.ts` Waypoints heading will break** — Line 67 of that file asserts `page.getByRole('heading', { name: 'Waypoints' })`. The StageList component removes that heading. Developer must update this assertion to `'Stages'` before or in the same PR.

4. **E2E serial mode required** — Pilgrim tests in `stages.spec.ts` must use `test.describe.configure({ mode: 'serial' })` to prevent concurrent Kinde session invalidation. `playwright.config.ts` uses `fullyParallel: true`.

5. **Reorder-warning E2E tests must use fresh test Camino** — Same pattern as `camino-update-delete.spec.ts`: create a uniquely-named Camino per describe block, clean up in `afterAll`. Using a shared seeded Camino for mutating reorder tests risks inter-test interference.

6. **Cache invalidation scope** — Ticket specifies invalidating `['stage', caminoId, stageNumber]` on PATCH success. It does NOT specify invalidating `['stages', caminoId]` (the list). Both must be invalidated so the stage list row updates after a distance/description change.

7. **`upsertStagePairs` has no unit tests** — This service method (N−1 upserts in a single transaction) is called from `CaminosService.create()` and `CaminosService.update()`. Needs unit tests for 0, 1, 2, 3-point inputs and DB error propagation.

8. **`id: null` test case contradicts eager-creation resolved decision** — The backend unit test plan includes a case for `id: null` in `findByCamino` output, but Resolved Decision 7 confirms Stage rows always exist after eager creation. The test plan is contradictory and should be corrected.

## Authorization model for PATCH (PILLY-STG-001)
- `JwtAuthGuard` on the route (same as PILLY-CAM-002 PATCH/DELETE).
- No `@Roles` decorator — service-layer check: `if (!userRoles.includes('pilgrim')) throw ForbiddenException()`.
- Owner users always hold `pilgrim` in Kinde — checking `pilgrim` alone is sufficient.
- No IDOR risk: Stages have no per-user ownership; role alone gates access.

## Shared-stage architecture notes
- Stage rows are globally shared by `(startPointId, endPointId)` unique constraint.
- Created eagerly in `CaminosService.create()` and `CaminosService.update()` via `upsertStagePairs`.
- PATCH through any Camino URL silently updates the stage for ALL Caminos sharing that pair (intentional per Resolved Decision 4).
- Stage rows are never deleted even when Camino point order changes — data persists, just becomes invisible from that Camino's derived list until ordering is restored.

## E2E test file to create
- `apps/e2e/tests/stages.spec.ts` — guest + pilgrim + API-level tests

## Test files that must be updated
- `apps/e2e/tests/camino-update-delete.spec.ts` line 67: `'Waypoints'` heading → `'Stages'`
- `apps/backend/src/caminos/caminos.service.spec.ts`: add `stage.upsert` mock to `makeTx()` once `CaminosService` gains `upsertStagePairs` call
