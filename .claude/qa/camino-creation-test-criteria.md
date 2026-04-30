# QA & Security Test Criteria — PILLY-CAM-001: Camino Creation

**Feature**: Pilgrims create a new camino at `/caminos/new`  
**Ticket**: PILLY-CAM-001  
**Author**: qa-security-validator  
**Date**: 2026-04-30  
**Status**: Pre-implementation (TDD — criteria must be satisfied before merge)

---

## 1. Architectural Assumptions

The following assumptions are made based on the existing codebase. If any assumption is wrong, flag it to the qa-security-validator before writing tests.

1. Auth is handled by `JwtAuthGuard` (extends `AuthGuard('jwt')`) + `RolesGuard`, applied via `@UseGuards()` at the controller method level — the same pattern as the existing `RoutesController`.
2. `RolesGuard` reads the role key string from the Kinde JWT payload's `roles` array (field: `role.key`). The pilgrim role key is `pilgrim`.
3. `created_by` is populated from `request.user.sub` (the Kinde JWT subject claim), injected server-side — it is never trusted from the request body.
4. All DB access goes through `SupabaseService` (using the service-role key). The Supabase JS SDK uses parameterized queries internally; raw string interpolation into SQL must not occur anywhere in service code.
5. The global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` is already active in `main.ts`. DTOs must carry `class-validator` decorators to benefit from it.
6. The backend test runner is **Vitest** (not Jest) — confirmed by `apps/backend/package.json`. All "unit test" references below use Vitest + `@nestjs/testing`.
7. The frontend test runner is **Vitest** + **React Testing Library** — confirmed by `apps/frontend/package.json`. `react-hook-form` and `useFieldArray` are assumed dependencies; confirm they are added to `package.json` before frontend tests are written.
8. The frontend route guard for `/caminos/new` is a server component that calls `getKindeServerSession()` and redirects unauthenticated or non-pilgrim users, consistent with the pattern in `app/layout.tsx`.
9. `GET /api/countries` returns a static in-memory array — no DB query involved. If this changes, add a separate robustness test for DB failure.

---

## 2. Backend Unit Tests (Vitest + `@nestjs/testing`)

All tests live under `apps/backend/src/caminos/`.

### 2.1 `CaminosService.create()`

**Test file**: `apps/backend/src/caminos/caminos.service.spec.ts`

#### Happy paths

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-BE-01 | Creates camino + one brand-new caminoPoint + one `camino_point_order` row | Returns the created camino entity with the resolved `caminoPointId` populated; all three DB inserts committed |
| CAM-BE-02 | Creates camino + links one existing caminoPoint by `caminoPointId` | Returns the camino entity; `camino_points` table NOT written; `camino_point_order` row created with correct `position` |
| CAM-BE-03 | Mixed array — first row is new point, second row links existing | Both `camino_point_order` rows created; `camino_points` written once (for new row only); positions are `1` and `2` respectively |
| CAM-BE-04 | Three new points in order | Three `camino_points` rows inserted (with unique name/country pairs); `camino_point_order` positions `1`, `2`, `3` |

Setup note: mock `SupabaseService` via `@nestjs/testing` test module. Use typed stubs for `.from().insert()`, `.from().select()` chains. Do not reach a real DB in unit tests.

#### Validation / rejection

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-BE-05 | Row provides both `caminoPointId` AND `name`/`country` simultaneously | Throws `BadRequestException` (400); no DB writes |
| CAM-BE-06 | Row provides neither `caminoPointId` NOR `name`/`country` | Throws `BadRequestException` (400); no DB writes |
| CAM-BE-07 | `caminoPointId` provided but does not exist in DB | Throws `BadRequestException` (400) with message indicating the point was not found; no camino or order row written |
| CAM-BE-08 | `caminoPoints` array is empty | Throws `BadRequestException` (400); camino not created |
| CAM-BE-09 | `name` field on camino is empty string | DTO validation rejects at controller level (422/400); service is never called |
| CAM-BE-10 | `name` field on camino exceeds max length (define a reasonable limit, e.g. 255 chars) | DTO validation rejects; service is never called |
| CAM-BE-11 | `verified: true` is included in the request body | Field is stripped by `ValidationPipe` (`whitelist: true`) before service receives it; `verified` defaults to `false` in DB |

#### Transaction / rollback

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-BE-12 | DB insert succeeds for camino and first caminoPoint, but `camino_point_order` insert fails | Full rollback: no camino row, no caminoPoint row, no order row persisted; service throws `InternalServerErrorException` (or a typed DB error) |
| CAM-BE-13 | Partial failure mid-array: second of three new caminoPoint inserts fails | Full rollback of all rows inserted so far; caller receives error, not partial data |

Implementation requirement: `CaminosService.create()` MUST wrap all DB writes in a Supabase transaction (using `rpc` with a DB function, or equivalent). Atomicity is a Definition-of-Done gate.

#### Race conditions

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-BE-14 | Two concurrent `create()` calls each providing a new caminoPoint with identical `(name, country)` | DB unique constraint on `(name, country)` fires for the second; service catches the constraint violation and returns `ConflictException` (409) with a human-readable message; first succeeds |
| CAM-BE-15 | `caminoPointId` lookup and camino creation race: point deleted between the lookup and the order-row insert | Service detects FK violation; returns 409 or 500 as appropriate; no orphaned order row left in DB |

### 2.2 `CaminoPointsService.search()`

**Test file**: `apps/backend/src/camino-points/camino-points.service.spec.ts`

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-BE-16 | `name=santi&country=ES` matches three records | Returns array of exactly those three records (up to 5) |
| CAM-BE-17 | `name=xyz&country=ES` matches nothing | Returns empty array `[]`, not null or undefined |
| CAM-BE-18 | `name` param missing from query | Controller throws `BadRequestException` (400) |
| CAM-BE-19 | `country` param missing from query | Controller throws `BadRequestException` (400) |
| CAM-BE-20 | DB returns 10 matching rows | Service returns exactly 5; limit is enforced in the query, not only by slicing the result array |
| CAM-BE-21 | `name` contains SQL metacharacter `%` or `_` | ILIKE uses parameterized binding; the character is treated as literal search input, not as a wildcard amplifier; result set is correct and no DB error occurs |
| CAM-BE-22 | `name` is a 1000-character string | Returns 400 (enforce a max-length constraint on query params) OR safely executes the ILIKE with the long string without crashing |

### 2.3 `CaminosController` — guard ordering (integration-style unit test)

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-BE-23 | Request to `POST /api/caminos` with no `Authorization` header | `JwtAuthGuard` rejects with 401 before any service method is invoked |
| CAM-BE-24 | Request to `POST /api/caminos` with valid JWT but no `pilgrim` role | `RolesGuard` rejects with 403; `CaminosService.create()` not called |
| CAM-BE-25 | `created_by` field in POST body differs from JWT `sub` | Field stripped by `whitelist: true`; persisted `created_by` matches JWT `sub` only |

---

## 3. Frontend Unit Tests (Vitest + React Testing Library)

All tests live under `apps/frontend/`.

**Test file**: `apps/frontend/app/caminos/components/CreateCaminoForm.test.tsx`

### 3.1 Rendering

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-FE-01 | Initial render | Camino name input, description textarea, and at least one caminoPoint row (name input, country select) are present in the DOM |
| CAM-FE-02 | Every input has an associated `<label>` with matching `htmlFor`/`id` | No orphaned inputs; verified via `getByLabelText` queries (no `getByRole('textbox')` shortcuts that bypass label association) |
| CAM-FE-03 | Country `<select>` is populated with options from the mocked `GET /api/countries` response | At least one `<option>` beyond the placeholder is rendered |

### 3.2 Field array controls

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-FE-04 | Clicking "Add waypoint" button appends a new caminoPoint row | Row count increases by 1; new row fields are empty |
| CAM-FE-05 | Remove button on a non-first row removes that row | Row count decreases by 1; other rows are unchanged |
| CAM-FE-06 | Remove button is absent (or disabled) on the first row | First row cannot be deleted when it is the only row |
| CAM-FE-07 | "Move up" control on row 2 swaps it with row 1 | Row order changes; field values of both rows are preserved |
| CAM-FE-08 | "Move down" control on last row is absent or disabled | User cannot move the last row down |

### 3.3 Validation and submission blocking

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-FE-09 | Submit attempted with empty camino name | Submit blocked; error message visible and associated with the name field |
| CAM-FE-10 | Submit attempted with a caminoPoint row that has no name and no country selected | Submit blocked; per-row error message visible |
| CAM-FE-11 | Submit attempted with camino name filled and all rows valid | `fetch` (or TanStack mutation) is called once with the correct payload structure |
| CAM-FE-12 | Submit button is `disabled` when form is invalid | Confirmed via `expect(submitBtn).toBeDisabled()` |
| CAM-FE-13 | Disabled submit button has `aria-disabled="true"` or is a native `<button disabled>` | Assistive technology receives the disabled state |

### 3.4 Debounced search and suggestion UI

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-FE-14 | User enters name only (no country selected) | Search query NOT fired; no suggestion UI shown |
| CAM-FE-15 | User enters name AND selects country; 300 ms elapses | `GET /api/camino-points/search` is called once with both params; use `vi.useFakeTimers()` to control debounce |
| CAM-FE-16 | User types quickly across multiple keystrokes within debounce window | Only one search request fires (debounce correctly cancels earlier calls) |
| CAM-FE-17 | Search returns one or more results | Suggestion UI renders showing name and description of the first (or best) match with "Yes" and "No" buttons |
| CAM-FE-18 | Search returns empty array | Suggestion UI does NOT render; form stays in new-point mode |
| CAM-FE-19 | Search API call fails (network error or 5xx) | Suggestion UI is suppressed; existing form values unchanged; no crash |
| CAM-FE-20 | User clicks "Yes" on suggestion | `caminoPointId` is set in form state; name and country fields become read-only; suggestion UI is dismissed |
| CAM-FE-21 | User clicks "No" on suggestion | Suggestion UI is dismissed; fields remain editable; form stays in new-point mode |
| CAM-FE-22 | After clicking "Yes" to link, user modifies the name field | Link is broken; `caminoPointId` is cleared; fields return to editable; a new search may fire |

### 3.5 Submission outcomes

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-FE-23 | Successful `POST /api/caminos` (201) | Router pushes to `/caminos` |
| CAM-FE-24 | Server returns 400 | Form retains all field values; a human-readable error message is shown; no redirect occurs |
| CAM-FE-25 | Server returns 409 (duplicate caminoPoint race) | Form retains all values; descriptive message shown (e.g., "A waypoint with this name and country already exists") |
| CAM-FE-26 | Server returns 500 | Generic error message shown; form retains values; no redirect |

### 3.6 Accessibility assertions

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-FE-27 | All form inputs reachable in logical Tab order | Tab walk does not skip any input or jump unexpectedly |
| CAM-FE-28 | Field error messages are in an `aria-live` region or have `role="alert"` | Rendered error messages are visible to screen readers without user navigation |
| CAM-FE-29 | "Yes" button in suggestion UI has a descriptive accessible name | Not just "Yes" — must include context, e.g. `aria-label="Link to existing waypoint: [name]"` or visible text that includes the waypoint name |
| CAM-FE-30 | "No" button has accessible name | `aria-label="Dismiss suggestion"` or equivalent descriptive text |
| CAM-FE-31 | Country `<select>` has a visible and programmatically associated label | `getByLabelText('Country')` (or i18n equivalent) resolves to the select element |

### 3.7 i18n compliance

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| CAM-FE-32 | All static strings in `CreateCaminoForm` use i18n keys | No hardcoded English strings in the component source; all text resolves through `useTranslations()` |
| CAM-FE-33 | Mock `useTranslations` as `(key) => key` in tests | Tests are locale-agnostic and will not break when translation copy changes |

---

## 4. Security Verification Checks (post-implementation gate)

These checks must pass during the post-implementation security review. They are not optional.

### 4.1 Authentication & Authorization

| ID | Check | Pass condition |
|----|-------|---------------|
| SEC-01 | `POST /api/caminos` with no `Authorization` header | HTTP 401; body does not reveal internal error detail |
| SEC-02 | `POST /api/caminos` with expired JWT | HTTP 401; `passport-jwt` rejects the token before service code runs |
| SEC-03 | `POST /api/caminos` with a valid JWT whose `roles` array is empty (no pilgrim role) | HTTP 403; `CaminosService.create()` is never invoked |
| SEC-04 | `POST /api/caminos` with a valid JWT whose `roles` contains a different role (e.g., `reviewer`) | HTTP 403 |
| SEC-05 | Guard ordering: inspect the `@UseGuards()` decorator order — `JwtAuthGuard` MUST precede `RolesGuard` | Static code review; reversed order would cause `RolesGuard` to read `request.user` before it is populated, silently allowing all requests through |

### 4.2 Mass Assignment / Field Injection

| ID | Check | Pass condition |
|----|-------|---------------|
| SEC-06 | POST body includes `"verified": true` | Persisted `verified` value is `false`; `ValidationPipe` strips the field (whitelist mode); confirm by reading back the created camino |
| SEC-07 | POST body includes `"created_by": "<other-user-id>"` | Persisted `created_by` equals the JWT `sub`, not the injected value; field is either absent from the DTO or explicitly ignored |
| SEC-08 | POST body includes `"id": "<crafted-uuid>"` | ID generated by DB (or service); injected value ignored |

### 4.3 SQL Injection / Query Injection

| ID | Check | Pass condition |
|----|-------|---------------|
| SEC-09 | `GET /api/camino-points/search?name=foo%27+OR+%271%27%3D%271&country=ES` | Returns an empty array or legitimate results; does NOT return all rows; Supabase JS SDK parameterized binding must be confirmed in code review (no raw `.rpc()` string interpolation) |
| SEC-10 | `GET /api/camino-points/search?name=_%25_%25&country=ES` | ILIKE wildcard characters in the search term do not cause runaway result sets (limit:5 enforced at DB query level) |

### 4.4 Result-cap Enforcement

| ID | Check | Pass condition |
|----|-------|---------------|
| SEC-11 | Supabase query for camino-points search uses `.limit(5)` at the query level | Code review confirms the limit is in the query, not applied via JS `.slice(0, 5)` post-fetch — an in-memory slice would not prevent a full-table scan |

### 4.5 Race Condition / Uniqueness

| ID | Check | Pass condition |
|----|-------|---------------|
| SEC-12 | Two simultaneous POST requests creating a caminoPoint with identical `(name, country)` | Exactly one record exists in `camino_points` after both complete; the second caller receives HTTP 409; the DB unique constraint is the enforcement mechanism, not application-layer deduplication alone |
| SEC-13 | POST body contains two caminoPoint rows with identical `(name, country)` within the same request | Service detects the intra-request duplicate before hitting the DB and returns 400 or 409 |

### 4.6 IDOR

| ID | Check | Pass condition |
|----|-------|---------------|
| SEC-14 | POST body references a `caminoPointId` (UUID) that does not exist in the database | HTTP 400; no camino or order row created |
| SEC-15 | POST body references a valid `caminoPointId` belonging to a different user's private data | Not applicable if caminoPoints are global/shared records — confirm this assumption. If points can be private in future, add ownership check |

### 4.7 Input Bounds

| ID | Check | Pass condition |
|----|-------|---------------|
| SEC-16 | `name` on camino DTO has `@MaxLength()` applied | Sending a 10,000-character name returns 400 at DTO validation, never reaches service |
| SEC-17 | `caminoPoints` array has `@ArrayMinSize(1)` and `@ArrayMaxSize(N)` (define a reasonable cap, e.g. 100) | Sending an empty array returns 400; sending 500 items returns 400 |
| SEC-18 | Search `name` query param has a max-length guard | Sending a 10,000-character name query param returns 400 or is safely truncated; does not cause DB timeout |

### 4.8 CORS and Public Endpoints

| ID | Check | Pass condition |
|----|-------|-----------------|
| SEC-19 | `app.enableCors()` is currently called without configuration in `main.ts` — this is overly permissive | Before this feature ships, CORS must be tightened to an explicit allowlist (`origin: [process.env.FRONTEND_URL]`). Flag as a pre-existing **High** severity finding that this feature must not worsen |

---

## 5. End-to-End Tests (Playwright)

**Test file**: `apps/e2e/tests/camino-creation.spec.ts`

| ID | Description | Expected outcome |
|----|-------------|-----------------|
| E2E-01 | Unauthenticated user navigates to `/caminos/new` | Redirected to login page; form not rendered |
| E2E-02 | Authenticated user without `pilgrim` role navigates to `/caminos/new` | Redirected or shown 403/access-denied page |
| E2E-03 | Authenticated pilgrim completes form with one new waypoint and submits | Redirected to `/caminos`; new camino appears in the list |
| E2E-04 | Authenticated pilgrim selects an existing waypoint via suggestion "Yes" flow and submits | Camino created; the shared caminoPoint is reused (not duplicated in DB) |
| E2E-05 | Pilgrim submits form without camino name | Submit blocked in browser; no network request made |
| E2E-06 | Debounced search: type in waypoint name + select country, wait for suggestion UI | Suggestion UI appears within 500 ms of typing stopping |

---

## 6. Definition of Done — QA Gate

All of the following must be true before the PR for PILLY-CAM-001 is approved:

- [ ] All CAM-BE-01 through CAM-BE-25 unit tests pass with `vitest run`
- [ ] All CAM-FE-01 through CAM-FE-33 unit tests pass with `vitest run`
- [ ] All E2E-01 through E2E-06 Playwright tests pass against a local or staging stack
- [ ] SEC-01 through SEC-18 verified (automated where possible; code review for SEC-05, SEC-09, SEC-11)
- [ ] SEC-19 (open CORS) addressed or tracked as a separate remediation ticket before merge
- [ ] `verified` field: DB default confirmed as `false`; no DTO field exposes it for write
- [ ] Transaction behavior confirmed: either a Supabase DB-level transaction function is used, or a compensating-delete strategy is documented and tested (CAM-BE-12, CAM-BE-13)
- [ ] `camino_points` unique constraint `(name, country)` exists in the DB migration
- [ ] No `console.log` statements in production code (linting enforced)
- [ ] All form strings use i18n keys (no hardcoded English copy)
- [ ] WCAG: form passes automated axe scan and manual Tab-key navigation test

---

## 7. Open Questions for Architect / Product Owner

1. **`pilgrim` role vs existing roles**: CLAUDE.md documents `Reviewer` and `Route Editor` roles. This feature introduces a new `pilgrim` Kinde role. Is this a new role or an alias for an existing one? The role key `pilgrim` must be confirmed against the Kinde tenant configuration before guard tests can pass.

2. **Transaction strategy**: Supabase JS SDK does not natively expose `BEGIN`/`COMMIT`. The architect must specify whether to use a DB-level RPC function, Supabase edge functions, or a compensating-rollback pattern. This decision gates CAM-BE-12 and CAM-BE-13.

3. **CaminoPoint visibility**: Are all `camino_points` rows globally visible to any pilgrim for linking? If yes, SEC-15 is N/A. If not, an ownership/visibility model must be defined and a corresponding IDOR check added.

4. **Country list source**: Is `GET /api/countries` a hardcoded constant array or a DB lookup? If DB, add error-handling tests for a failed query.

5. **Max waypoints per camino**: No upper bound is specified. Define one before CAM-BE (SEC-17) test thresholds can be set precisely.

6. **`react-hook-form` dependency**: Not listed in `apps/frontend/package.json` at the time of writing. Must be added before frontend test stubs can be written. Confirm with `senior-frontend-dev`.
