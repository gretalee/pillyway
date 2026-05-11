# QA & Security Review — PILLY-STG-001 "Introduce Stage entity"

**Reviewer:** qa-security-validator agent
**Date:** 2026-05-11
**Ticket:** PILLY-STG-001
**Branch under review:** feature/stages (not yet created — pre-implementation review)
**Depends on:** PILLY-CAM-002

---

## Summary

This ticket introduces the Stage entity as a globally-shared, Camino-order-derived concept with three backend endpoints (GET list, GET detail, PATCH), a frontend stage list/detail/edit flow, and a client-side reorder-warning dialog. The specification is thorough and internally consistent. The authorization model for stages (service-layer pilgrim check, no `@Roles` decorator) deliberately mirrors the PILLY-CAM-002 pattern. Several concrete gaps exist: two silent-failure risks in input validation, a missing cross-Camino mutation E2E test that is called out in acceptance criteria but absent from the test plan, a broken internal description about lazy creation that is superseded by eager creation (causing contradictory documentation), and the existing `camino-update-delete.spec.ts` waypoints-heading assertion that will break the moment this feature is merged. One medium-severity security concern exists around `@IsNumber` accepting IEEE 754 special values. All findings are actionable and none are blockers of the specification itself — they are implementation directives that must be tracked.

---

## 1. Test Coverage Completeness

**Verdict: ⚠️ Partial**

### What is well-covered

The test plan maps cleanly to the acceptance criteria for the happy paths: CRUD on a single stage, role-gating (401/403/200), navigation buttons (first/last/middle stage), reorder-warning dialog states (show/confirm/cancel/no-dialog), and the clear-to-null path. The use-case descriptions and the edge-case table are detailed enough to write unit and integration tests directly from them.

### Gap 1 — Cross-Camino shared-stage mutation test is in acceptance criteria but absent from the test plan

The acceptance criteria contain this explicit check:

> Given: two Caminos both have CaminoPoints A → B → C. Then: they share the same Stage records for A→B and B→C. A PATCH on that stage from one Camino's context updates the description that is also visible from the other Camino's context.

This is the most important correctness guarantee of the shared-stage architecture. It is listed in the "Shared stage reuse" acceptance criteria block but does not appear anywhere in the backend unit tests, frontend unit tests, or E2E test plan. Without an explicit test for cross-Camino propagation, the upsert logic could silently create duplicate Stage rows (if the unique constraint were ever removed or the upsert `where` clause were wrong) and no automated test would catch it.

**Required addition to the backend service spec:**
```
StagesService.update() — cross-camino visibility:
- Given two Caminos that share the same (startPointId, endPointId) pair, PATCHing the stage via
  Camino A's context and then reading it via Camino B's context (findByCamino / findOne) returns
  the updated distance / description.
```

**Required addition to E2E:**
```
Shared stage: PATCH from Camino A's URL updates value visible on Camino B's stage detail page.
```

### Gap 2 — `findByCamino` test for `id: null` / lazy creation is now contradictory

The backend unit test plan includes:
> Returns `StageListItem` objects with `id: null`, `distance: null`, `description: null` for pairs that have no Stage row in the DB.

However, Resolved Decision 7 and the DoD explicitly state that `id` is always a UUID because Stage rows are created eagerly at Camino-save time. Section 3.4 further clarifies that no lazy creation exists in GET endpoints. This means the `id: null` case cannot occur in production, yet a unit test is planned for it. This creates confusion for the implementer: either the unit test is dead code or it reveals a code path that should not exist.

The test plan must be corrected. Remove the `id: null` case from the unit test list and replace it with a guard against the scenario, or mark it explicitly as "this case cannot arise after eager creation; test is intentionally omitted."

### Gap 3 — No unit test for `upsertStagePairs` in `StagesService`

Section 3.4 defines a service method `upsertStagePairs(pointIds: string[]): Promise<void>`. This method is called from `CaminosService.create()` and `CaminosService.update()` but has no dedicated unit test. At minimum the following scenarios need coverage:
- N=0 points: no-op (no upserts called)
- N=1 point: no-op (no consecutive pairs)
- N=2 points: exactly one upsert called
- N=3 points: exactly two upserts called, in the correct order
- One of the upserts fails (DB error propagation)

Absence of this test means the transaction boundary and the N−1 loop logic will go into production without automated proof.

### Gap 4 — `UpdateCaminoForm` reorder-warning tests are listed but the detection algorithm has a boundary case not covered

The detection algorithm checks whether a departing pair has `distance !== null || description !== null`. There is no test for the boundary case where a pair has `distance === 0`. Per section 3.3, `@Min(0.1)` prevents `distance: 0` from ever being stored — but that constraint only applies to the PATCH endpoint. If a Stage row were somehow inserted with `distance: 0` through another path, the detection logic would treat it as "no data" (since `0 !== null` is truthy, this is actually fine). More precisely: the risk is the converse — `distance: 0` _is_ truthy, so the dialog _would_ appear, which is correct behaviour. However, the test plan does not include a case that explicitly validates that `distance: 0` (if it existed) triggers the warning, leaving the boundary contract untested. This is Low priority but worth noting.

### Gap 5 — No test for staleList / cache invalidation after PATCH

The acceptance criteria state (UC-3, step 7):
> Invalidate TanStack Query cache key `['stage', caminoId, stageNumber]`.

The frontend unit test plan covers mutation success and navigation, but there is no test asserting that the `['stage', caminoId, stageNumber]` query is invalidated (or that the detail page re-fetches). A unit test for `useUpdateStage` should assert that `queryClient.invalidateQueries(['stage', caminoId, stageNumber])` is called on success.

Additionally, the ticket does not specify whether `['stages', caminoId]` (the list) is also invalidated. It should be — after saving distance or description, the stage list row also needs to reflect the update. This omission should be resolved before implementation.

### Gap 6 — Existing E2E test will break on merge

The existing `camino-update-delete.spec.ts` test at line 67 asserts:
```
await expect(page.getByRole('heading', { name: 'Waypoints' })).toBeVisible();
```

This heading will be removed when `StageList` replaces the waypoints `<ol>`. The ticket (Resolved Decision 8) notes the developer must update this test but does not include that update in the DoD checklist. It must be added as an explicit DoD item to prevent a red CI on merge.

---

## 2. Security: Authorization

**Verdict: ✅ Sound (with one assumption documented)**

### Pattern analysis

The ticket prescribes no `@Roles` decorator on the PATCH route, with authorization enforced in the service via:
```typescript
if (!userRoles.includes('pilgrim')) throw new ForbiddenException();
```

This exactly mirrors the PILLY-CAM-002 pattern for `CaminosService.update()` and `CaminosService.delete()`. That pattern has already been reviewed and approved. The `JwtAuthGuard` on the route ensures that `userRoles` is never attacker-controlled — it is extracted from the verified JWT by the passport strategy before the controller method is reached. There is no bypass risk: an unauthenticated request fails at `JwtAuthGuard` (401) before the service method is called; an authenticated request without `pilgrim` role fails the service-layer check (403).

**Assumption:** I am assuming that `userRoles` arrives at the service as the validated claim from the Kinde JWT (populated by `KindeJwtStrategy`), not from a user-supplied request body or query parameter. If the implementation passes `req.body.roles` or `req.query.roles` here, that would be a Critical finding. The PILLY-CAM-002 service spec uses `KindeRole[]` typed values extracted by the strategy, so this assumption is well-founded.

### Owner role transitivity

The ticket confirms (Resolved Decision 5) that every `owner` Kinde user is also assigned `pilgrim`, so checking `pilgrim` is sufficient. The service-layer check does not need to handle `owner` as a separate case. This is safe as long as the Kinde role assignment is enforced at the identity provider level and not by application code. The application correctly treats this as an IdP guarantee.

### No IDOR risk

Stages are addressed by `(caminoId, stageNumber)`. The `caminoId` is a UUID and cannot be guessed. The `stageNumber` is a positional integer derived from the Camino's CaminoPoint ordering, so an out-of-range value returns 404, not another user's data. There is no per-stage ownership — the spec explicitly says role alone determines access — so there is no direct-object-reference escalation vector.

---

## 3. Security: Input Validation

**Verdict: ⚠️ Concern — two bypass vectors**

### Finding 1 — `@IsNumber` accepts `NaN` and `Infinity` by default (Medium)

`class-validator`'s `@IsNumber()` uses `typeof value === 'number'` as its primary check. `NaN` and `Infinity` both satisfy `typeof === 'number'`. The decorator accepts an options object `{ allowNaN: false, allowInfinity: false }`, but these default to `false` only in some versions. The current class-validator version in this monorepo must be verified.

If `NaN` or `Infinity` reaches Prisma, Prisma will attempt to store them as a PostgreSQL `float8`. PostgreSQL accepts `'NaN'::float8` and `'Infinity'::float8` as valid values. The `@Min(0.1)` constraint will pass for `Infinity` (Infinity > 0.1 is true). The `@Max(9999.9)` constraint will also pass for `Infinity`. `NaN` comparisons return false for all `@Min`/`@Max` checks, meaning `NaN` may slip through or be rejected depending on evaluation order.

The `@IsNumber({ maxDecimalPlaces: 1 })` call must be written as:
```typescript
@IsNumber({ maxDecimalPlaces: 1, allowNaN: false, allowInfinity: false })
```

Additionally, if `distance` can be sent as a string `"24.7"` from a JSON-parsed body where the type is coerced, `class-validator` will reject it cleanly. However, if `useKindeBrowserClient().accessTokenEncoded` is used in the hook and the token contains a number field, there is no concern here — the issue is purely on the DTO validation side.

**Remediation:** Explicitly pass `{ allowNaN: false, allowInfinity: false }` to `@IsNumber()` in `UpdateStageDto`.

### Finding 2 — Empty body guard may not catch `{ distance: undefined }` (Low)

The ticket requires a class-level "at least one field" guard to reject empty `{}` bodies. If this is implemented the same way as `UpdateCaminoDto` (a custom decorator or `@ValidateIf`), it must handle the case where a client sends `{ "distance": undefined }` (which becomes `{}` after JSON deserialization) versus `{ "distance": null }` (which is a valid clear operation).

The distinction matters: `@IsOptional()` skips validation when the value is `undefined` or `null`. A body of `{ "distance": undefined }` after deserialization is functionally identical to `{}`. The "at least one field" guard must count only fields that are explicitly present in the parsed body (i.e., where `Object.keys(dto).length > 0` after whitelist stripping), not fields that happen to be `undefined`.

The existing `UpdateCaminoDto` should be inspected to see how it implements this guard, and the same pattern reused. If that implementation has a bug with `undefined`-valued fields, it should be fixed in both DTOs simultaneously.

### Finding 3 — `description` max-length constraint not backed by DB schema (Low)

The ticket specifies `@MaxLength(5000)` on `description` at the DTO level. The Prisma schema defines `description String?` with no DB-level length constraint. This is fine — the validation is enforced at the application layer — but it means a direct DB insert (e.g., via a migration seed script or a compromised DB connection) could store strings exceeding 5000 chars, which would then be returned raw to the frontend. Consider adding `@db.VarChar(5000)` to the schema. This is Low priority but good defensive practice.

---

## 4. Shared Stage Mutation Risk

**Verdict: ⚠️ Concern — missing test, acceptable architectural risk with documented caveat**

### The core risk

When Pilgrim A PATCHes stage `(A→B)` from Camino 1's URL, the update is written to the globally-shared Stage row. Any Camino that also traverses `A→B` will immediately reflect the change. The ticket calls this "silent" (Resolved Decision 4) and explicitly accepts it. This is a product decision, not a security finding. The missing test is the gap.

### Missing cross-Camino mutation test

As documented in section 1 (Gap 1), there is no test that verifies a PATCH through Camino 1 is visible when reading through Camino 2. Without this test, the shared-stage guarantee is not contractually enforced by the test suite.

### Upsert race condition risk (Low)

Section 3.4 specifies a `prisma.$transaction([...])` with N−1 upsert calls. In PostgreSQL, `INSERT ... ON CONFLICT DO NOTHING` (which Prisma uses for `upsert` with no `update` body) is safe under concurrent inserts on the same unique key. However, if `CaminosService.create()` is called concurrently for two Caminos that share the same point pair, both transactions will attempt to upsert the same Stage row. PostgreSQL's unique constraint will cause one to wait or retry, but the net result is correct (one Stage row, correct data). This is not a bug but worth noting for load testing.

### Uniqueness constraint failure scenario

If the unique constraint `@@unique([startPointId, endPointId])` were accidentally removed from the schema (e.g., during a migration rollback), the upsert would insert duplicate rows and `findUnique` in `StagesService.update()` would throw a "multiple rows returned" error. This would manifest as an unhandled 500. The defensive upsert fallback mentioned in section 3.3 would not help here because the problem is at the read path (`findUnique`). The service should use `findFirst` (which returns one row even if multiple exist) or handle the `PrismaClientKnownRequestError` from multiple-row situations gracefully. This is a Low robustness concern.

---

## 5. Reorder-Warning Bypass

**Verdict: ✅ Acceptable — with an explicit documentation note required**

### Analysis

The reorder warning is a client-side UX guard. An attacker or a client with JS disabled can submit the Camino update `PATCH /api/caminos/:id` without triggering the dialog. However, the consequence is not data destruction — Stage rows are never deleted, and their `distance`/`description` data persists. The only effect is that the enriched stage pair becomes temporarily invisible from that Camino's stage list view until the ordering is restored.

This is not a security issue because:
1. The user who bypasses the dialog is a pilgrim (already authorized to update any Camino)
2. No data is deleted from the DB — the bypass merely results in a Camino save without the warning UI
3. The data can always be recovered by restoring the original point order

However, the ticket does not explicitly state that this bypass is acknowledged and acceptable. The ticket should include a note in the "Out of Scope" or the UC-4 section:

> The reorder-warning dialog is a client-side UX guardrail, not a server-side enforcement. A client that submits the PATCH without triggering the dialog will succeed. This is intentional: the server's contract is to save the Camino with the supplied ordering. The data-preservation guarantee is enforced by the no-delete policy on Stage rows, not by a server-side dialog.

Without this explicit acknowledgement, a future developer might attempt to add server-side enforcement (a "confirm" flag in the request body), which would over-engineer the feature.

---

## 6. E2E Test Isolation

**Verdict: ⚠️ Concern — serial mode required for pilgrim tests in `stages.spec.ts`**

### Analysis

The existing `camino-update-delete.spec.ts` wraps all pilgrim tests in `test.describe.configure({ mode: 'serial' })` to prevent concurrent Kinde sessions for the same user account from invalidating each other (the comment at line 113 explains this explicitly). The `playwright.config.ts` sets `fullyParallel: true` at the project level, which means all describe blocks run in parallel by default.

`stages.spec.ts` will also need authenticated pilgrim tests (edit form, PATCH, reorder warning). If those tests run in parallel with the pilgrim tests in `camino-update-delete.spec.ts`, the same Kinde account will be logged in simultaneously in two workers, risking session invalidation.

**Required:** The pilgrim `test.describe` block in `stages.spec.ts` must include `test.describe.configure({ mode: 'serial' })`, exactly matching the existing pattern.

**Additional concern:** If the reorder-warning E2E tests mutate a shared seeded Camino (one with enriched stages), they could interfere with the stage-edit tests in the same file (if the Camino is left in a reordered state after the "Save anyway" test). The test plan does not specify whether the reorder-warning E2E tests use a fresh camino or the shared seeded one. Given the existing pattern of creating a fresh uniquely-named camino for mutating tests (see `createCaminoViaForm` helper), the reorder-warning tests should follow the same pattern: create a fresh Camino, add at least two waypoints, enrich a stage via the edit form, then test the reorder warning. The shared seeded Camino should be read-only in E2E.

---

## 7. `no test.skip()` Rule Compliance

**Verdict: ⚠️ Concern — one area at risk**

### Analysis

The project's `CLAUDE.md` rule prohibits `test.skip()` for missing prerequisites. Missing env vars must fail with `expect(value, '...').toBeTruthy()`. The ticket's test plan explicitly states this:

> Missing environment variables must cause test failure with `expect(value, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy()` — never `test.skip()`.

The ticket's E2E test plan correctly documents this requirement. However, the test plan covers env-var checks for `E2E_PILGRIM_EMAIL` and `E2E_PILGRIM_PASSWORD` but does not call out what to do if the required seeded Camino is absent from the database.

The plan states:
> Tests assume: at least one seeded Camino with at least 3 CaminoPoints

If that Camino does not exist, the guest tests would either navigate to a Camino detail page with fewer than 3 points (wrong test data) or find no Camino at all (causing a timeout or null-deref crash in the test helper). Neither scenario produces a clear assertion failure with a descriptive message.

**Required:** All E2E tests that depend on a seeded Camino with ≥3 CaminoPoints should assert the precondition:
```typescript
const stageRows = page.locator('ol[data-testid="stage-list"] li');
await expect(stageRows.first(), 'Test requires a seeded Camino with at least 2 stages').toBeVisible({ timeout: 10_000 });
const count = await stageRows.count();
expect(count, 'Test requires a seeded Camino with at least 2 stages').toBeGreaterThanOrEqual(2);
```

This converts a silent timeout or wrong-data failure into an explicit assertion failure with a clear message.

---

## 8. Missing Test Cases

**Verdict: ⚠️ Several additions required**

Beyond the gaps identified above, the following test cases are missing from the ticket's test plan:

### MT-1 — `stageNumber` = 0 and negative values in E2E

The edge-case table documents that `stageNumber = 0` returns 404. The backend unit test plan includes this. But the E2E test plan only covers "invalid `stageNumber`" as navigation button edge cases. There is no E2E test that directly navigates to `/caminos/:id/stages/0` or `/caminos/:id/stages/-1` and asserts the error state. This should be added as an API-level test (using Playwright `request` fixture) mirroring the existing `GET /api/caminos/:id returns 404 for a non-existent camino ID` pattern in `camino-update-delete.spec.ts`.

### MT-2 — PATCH with `distance: null` clears the field (backend unit test)

The backend unit test plan includes:
> Updates `description` to `null` (clears it)

But does **not** include the symmetric case: updates `distance` to `null` (clears it). Both fields must be explicitly tested for null-clearing since the behaviour of class-validator with `@IsOptional()` and a `null` value needs separate verification. The existing `UpdateCaminoDto` bug (where `null` for `description` triggered `@IsString()` failure) shows this is a real risk.

### MT-3 — `description` max-length enforcement (backend unit test)

The test plan does not include a test for `description` exceeding 5000 characters returning 400. Given that `@MaxLength(5000)` is specified, a unit test for this constraint should be added to `StagesController` handler tests.

### MT-4 — `caminoId` UUID validation for PATCH (E2E / API test)

The existing `camino-update-delete.spec.ts` includes:
> `GET /api/caminos/:id returns 400 for a non-UUID path parameter`

The equivalent test for `PATCH /api/caminos/:caminoId/stages/:stageNumber` with a non-UUID `caminoId` is absent from the stages test plan. Should be added to the API-level authorization describe block.

### MT-5 — Concurrent PATCH on a shared stage (integration test, lower priority)

Two pilgrims simultaneously PATCH the same stage. The last-write-wins outcome should be deterministic (Prisma/Postgres row-level locking). This is an integration test that can be deferred but should be on the backlog.

### MT-6 — `useStages` hook disabled when `caminoId` is empty string

The hook spec states `// Disabled when caminoId is empty string`. This is a guard against rendering `StageList` before the Camino ID is resolved (e.g., on initial render before params are available). The unit test plan does not include a test asserting the query is disabled (i.e., no fetch is issued) when `caminoId === ''`. This should be added to `use-stages.test.ts`.

### MT-7 — `StageEditForm` submits `null` for cleared description (frontend unit test)

The test plan includes:
> Clearing the distance field sends `distance: null` in the payload.

But the symmetric test for clearing description (setting to `null`) is missing. Both fields must be tested explicitly.

### MT-8 — Owner role: `<AccessDenied />` rendered on edit page

The edge-case table states:
> Owner visits `/caminos/[id]/stages/1/edit` — Server component renders `<AccessDenied />`.

This is in the acceptance criteria but there is no corresponding E2E test in the test plan. An E2E test using an owner-role account (or a simulated role state in an RTL test) is needed.

---

## Prioritised Findings

| Priority | ID | Finding | Action Required |
|---|---|---|---|
| P1 | GAP-1 | Cross-Camino shared-stage mutation test missing from unit test plan and E2E | Add backend service test + E2E test for cross-Camino PATCH visibility |
| P1 | GAP-6 | Existing `camino-update-delete.spec.ts` Waypoints heading assertion will break on merge | Add DoD checklist item; developer must update the assertion before merge |
| P1 | SEC-1 | `@IsNumber` accepts `NaN` and `Infinity` without explicit opt-out | Set `@IsNumber({ maxDecimalPlaces: 1, allowNaN: false, allowInfinity: false })` in `UpdateStageDto` |
| P2 | GAP-3 | `upsertStagePairs` service method has no unit tests | Add unit tests for 0, 1, 2, 3-point inputs and DB error propagation |
| P2 | GAP-2 | `id: null` test case in unit plan contradicts eager-creation resolved decision | Remove or annotate the `id: null` test case in the test plan |
| P2 | ISO-1 | `stages.spec.ts` pilgrim tests need `mode: 'serial'`; reorder-warning tests need fresh test Camino | Explicitly state these constraints in the test plan and DoD |
| P2 | MT-2 | `distance: null` clear path not unit-tested on backend | Add unit test for `distance: null` PATCH clearing the field |
| P2 | GAP-5 | Cache invalidation scope undefined (`['stages', caminoId]` list not mentioned) | Ticket must specify that both `['stage', ...]` and `['stages', ...]` keys are invalidated on PATCH success |
| P3 | ENV-1 | Seeded Camino precondition not guarded by clear assertion in E2E | Add stage-count precondition assertion at top of tests requiring ≥3-point Camino |
| P3 | SEC-2 | Empty-body guard must distinguish `undefined` fields from absent fields | Verify `UpdateCaminoDto` pattern handles this correctly before reuse |
| P3 | MT-3 | `description` max-length test missing from controller test plan | Add `@MaxLength(5000)` test case |
| P3 | MT-7 | `description: null` clear path not tested in `StageEditForm` unit test | Add symmetric test for clearing description field |
| P3 | DOC-1 | Reorder-warning bypass is client-only but not documented as intentional | Add explicit acknowledgement note to ticket section 3.5 or UC-4 |
| P4 | MT-1 | No E2E/API test for `stageNumber=0` and negative values | Add API-level assertion test mirroring existing camino 400/404 pattern |
| P4 | MT-4 | No API test for non-UUID `caminoId` on PATCH endpoint | Add to API authorization describe block in `stages.spec.ts` |
| P4 | MT-6 | `useStages` disabled-when-empty unit test missing | Add to `use-stages.test.ts` |
| P4 | MT-8 | Owner role `<AccessDenied />` on edit page not covered in E2E | Add E2E or RTL test for owner attempting to access stage edit page |
| P4 | ROB-1 | `findUnique` on `(startPointId, endPointId)` could panic if unique constraint is dropped | Consider `findFirst` + explicit error message instead of `findUnique` in `StagesService.update()` |
