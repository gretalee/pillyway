---
id: PILLY-CAM-001
title: "Allow pilgrims to create a camino with ordered caminoPoints"
type: Feature
priority: Critical
status: Finalized (v3 — all open questions resolved)
last_updated: 2026-04-30
---

# PILLY-CAM-001 — Allow pilgrims to create a camino with ordered caminoPoints

**Type:** Feature
**Priority:** Critical — foundational data-entry; no camino data exists in the system without this
**Status:** Finalized (v3) — all open questions resolved; ready for implementation

---

## User Persona(s)

**Pilgrim (Route Editor)**
An authenticated user with the `pilgrim` Kinde role. They have walked or researched a camino and want to contribute it to the Pillyway database so other users can discover and follow it. They are not necessarily technical; the form must be intuitive.

**Guest / Reviewer** (read-only, affected indirectly)
Any visitor who benefits from the list of caminos once they are created. They do not use this feature directly.

---

## User Story

As a pilgrim, I want to fill in a form with a camino name, description, and an ordered list of waypoints (caminoPoints), so that the route is saved to the database and appears in the public camino list for other users to discover.

---

## Context & Background

Pillyway has no content without caminos. This ticket establishes the full creation flow — backend module, database schema, API contract, and frontend form — so that pilgrims can start contributing data. It is the prerequisite for every downstream feature (reviews, stages, accommodations, verification).

The domain uses Spanish-inspired naming throughout: **camino** (route), **caminoPoint** (waypoint/city on the route). See memory file `feature_camino_creation.md` for canonical naming decisions.

The existing backend `RoutesModule` is a placeholder stub. It must be **deleted** and replaced by a new `CaminosModule`. This is an explicit implementation task.

---

## Use Case Description

1. An authenticated user with the `pilgrim` role navigates to `/caminos/new`.
2. The page checks authentication (redirects to Kinde login if not authenticated) and then checks the `pilgrim` role (renders a "not authorized" message if the role is absent).
3. The user fills in:
   - Camino name (required)
   - Camino description (optional)
   - An ordered list of caminoPoints, each with: name (required), country (required, selected from dropdown), and description (optional). Points can be reordered and removed.
4. As the user enters a caminoPoint name and selects a country, the form performs a debounced search against `GET /api/camino-points/search` once both fields have a value.
5. If one or more existing caminoPoints are returned, the form displays an inline suggestion UI beneath the name field showing the matched point's name and description, and asks: "Did you mean this point?"
6. The user makes an explicit choice:
   - **"Yes, use this existing point"** — the form links this row to the existing `caminoPointId`. The name and description fields become read-only and are populated with the existing point's data.
   - **"No, create a new one"** — the form dismisses the suggestion and proceeds with the user's own input as a new record.
7. If no matches are returned, no suggestion is shown and the flow continues as normal.
8. The user submits the form.
9. The frontend sends a `POST /api/caminos` request. Each caminoPoint row in the payload carries either an existing `caminoPointId` or a new `{ name, country, description }` object, depending on the user's choice in step 6.
10. The backend creates the `camino` record, creates or links the `camino_point` records (see Data Models section), and inserts rows into `camino_point_order` to encode the ordered relationship.
11. On success, the user is redirected to `/caminos` where the new camino appears in the list.
12. On error, the form displays an inline error message without losing the user's input.

---

## Acceptance Criteria

- [ ] **Auth gate**: Visiting `/caminos/new` while unauthenticated redirects to the Kinde login page.
- [ ] **Role gate**: A logged-in user without the `pilgrim` role sees a "not authorized" message and cannot access the form.
- [ ] **Form renders**: A logged-in pilgrim sees the `CreateCaminoForm` with fields for name, description, and a dynamic caminoPoint list.
- [ ] **CaminoPoint management**: The user can add multiple caminoPoints, reorder them (up/down controls), and remove any entry.
- [ ] **Country dropdown**: The country field in each caminoPoint row is populated from `GET /api/countries` (fetched via TanStack Query). It is not a hardcoded constant on the frontend.
- [ ] **Duplicate check — trigger**: After the user has entered a caminoPoint name AND selected a country, a debounced call to `GET /api/camino-points/search?name=<query>&country=<country>` is made (on blur from the name field or when both fields have values). The call is debounced to avoid excessive requests during typing.
- [ ] **Duplicate check — suggestion shown**: If the search returns one or more results, an inline suggestion UI appears beneath the name field displaying the matched point's name and description, plus two explicit action buttons: "Yes, use this existing point" and "No, create a new one".
- [ ] **Duplicate check — "Yes" path**: Clicking "Yes, use this existing point" sets the row's internal state to reference the existing `caminoPointId`. The name and description inputs for that row become read-only and reflect the existing point's data.
- [ ] **Duplicate check — "No" path**: Clicking "No, create a new one" dismisses the suggestion and leaves the user's input in the fields; the row will create a new caminoPoint on submission.
- [ ] **Duplicate check — no match**: If the search returns no results, no suggestion UI is shown. The row proceeds as a new caminoPoint.
- [ ] **Validation (client-side)**: react-hook-form prevents submission if camino name is empty or if any caminoPoint is missing name or country. Error messages are displayed inline per field.
- [ ] **Validation (server-side)**: `POST /api/caminos` returns `400` with a descriptive error body if required fields are missing or malformed, regardless of what the client sends.
- [ ] **Submission — existing point**: When a caminoPoint row is linked to an existing record, the POST body includes `{ caminoPointId: "<uuid>" }` for that row (no name/country/description).
- [ ] **Submission — new point**: When a caminoPoint row is a new record, the POST body includes `{ name, country, description }` for that row (no caminoPointId).
- [ ] **Backend handles both cases**: The backend correctly creates or links caminoPoints based on which fields are present in each caminoPoint item. An atomic transaction covers all rows.
- [ ] **`verified` flag**: Newly created caminos always have `verified = false`. The pilgrim cannot set this field.
- [ ] **Success redirect**: After a successful `POST`, the frontend redirects the user to `/caminos`.
- [ ] **Camino list**: `GET /api/caminos` returns the new camino (including unverified ones) so it is immediately visible on `/caminos`.
- [ ] **Error handling**: Network or server errors surface as a user-visible error message on the form without clearing the user's input.
- [ ] **i18n**: All user-facing strings use i18n keys under the `caminos_new` namespace (DE and EN), including the duplicate suggestion UI text.
- [ ] **No `console.log`**: No debug logging in production code paths.
- [ ] **RoutesModule removed**: The existing `RoutesModule` is deleted from the backend. No references to it remain.

---

## Data Models

### Supabase / PostgreSQL tables

#### `caminos`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | NOT NULL |
| `description` | `text` | nullable |
| `verified` | `boolean` | NOT NULL, default `false` — set by system/admin only |
| `created_by` | `uuid` | FK to Kinde user ID (stored as text or uuid per auth setup) |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

#### `camino_points` — global shared entities
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | NOT NULL |
| `country` | `text` | NOT NULL — constrained to allowed values (see Countries endpoint) |
| `description` | `text` | nullable |
| `created_at` | `timestamptz` | default `now()` |

**Important:** CaminoPoints are shared global entities. "Santiago de Compostela" exists once in the DB and can be referenced by many caminos. The `camino_points` table must have a unique constraint on `(name, country)` to prevent duplicates at the DB level.

#### `camino_point_order` — join table (many-to-many with ordering)
| Column | Type | Notes |
|---|---|---|
| `camino_id` | `uuid` | FK → `caminos.id`, NOT NULL |
| `camino_point_id` | `uuid` | FK → `camino_points.id`, NOT NULL |
| `position` | `integer` | NOT NULL — 0-based, document in code |
| PK | composite | `(camino_id, camino_point_id)` |

### V1 CaminoPoint creation policy

The frontend now surfaces potential duplicates to the user before submission (Option B). As a result, the backend must handle two distinct cases per caminoPoint item in the POST body:

| Case | Payload from frontend | Backend action |
|---|---|---|
| User chose an existing point | `{ caminoPointId: "<uuid>" }` | Verify the ID exists; use it directly in `camino_point_order`. Do not create a new record. |
| User chose to create a new point | `{ name, country, description }` | Insert a new `camino_point` row. If a record with `(name, country)` already exists at the DB level (race condition or bypass), the unique constraint prevents a duplicate — return a 409 with a descriptive message. |

The description field of an existing caminoPoint is never overwritten when linking to it.

---

## API Endpoints

### `GET /api/caminos`
- Auth: public (no token required)
- Response `200`: array of `{ id, name, description, verified }`
- Includes unverified caminos in V1 (filter by verified status is a future feature)

### `POST /api/caminos`
- Auth: `JwtAuthGuard` + `RolesGuard` with `@Roles('pilgrim')`
- Request body — each item in `caminoPoints` is **either** an existing-point reference **or** a new-point definition:
  ```json
  {
    "name": "Camino Francés",
    "description": "The most popular route...",
    "caminoPoints": [
      { "caminoPointId": "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
      { "name": "Pamplona", "country": "Spain", "description": null }
    ]
  }
  ```
- Validation rules per caminoPoint item (conditional, handled in `CreateCaminoPointDto`):
  - If `caminoPointId` is present: `name`, `country`, `description` must be absent. `caminoPointId` must be a valid UUID.
  - If `caminoPointId` is absent: `name` (string, non-empty) and `country` (string, in allowed list) are required; `description` is optional.
  - A payload item that provides both `caminoPointId` and `name`/`country` is rejected with `400`.
- Behavior: atomic transaction — creates camino, links or creates caminoPoints, inserts `camino_point_order` rows.
- Response `201`: `{ id, name, description, verified, caminoPoints: [{ id, name, country, position }] }`
- Response `400`: validation error (missing required fields, invalid country value, empty caminoPoints array, both/neither fields provided)
- Response `401`: not authenticated
- Response `403`: authenticated but missing `pilgrim` role
- Response `409`: a new caminoPoint item conflicts with an existing DB record by `(name, country)` (race condition guard)

### `GET /api/camino-points/search`
- Auth: public (no token required)
- Query params: `name` (string, required), `country` (string, required)
- Behavior: case-insensitive `ILIKE '%<name>%'` search on `camino_points.name`, filtered by exact `country` match. Returns up to 5 results.
- Response `200`:
  ```json
  [
    { "id": "<uuid>", "name": "Saint-Jean-Pied-de-Port", "country": "France", "description": "Starting point of the Francés" }
  ]
  ```
  Returns an empty array `[]` if no matches found.
- Response `400`: if `name` or `country` query param is missing
- Purpose: powers the inline duplicate suggestion UI in the frontend form. Results are displayed to the user who then explicitly decides whether to link to an existing record or create a new one.

### `GET /api/countries`
- Auth: public (no token required)
- Response `200`: array of allowed country values, e.g.:
  ```json
  ["France", "Spain", "Portugal", "Germany", "Italy"]
  ```
- Purpose: the frontend country dropdown fetches this list via TanStack Query rather than using a hardcoded constant, allowing the allowed list to be updated server-side without a frontend deploy.
- Backend implementation: the list is defined as a constant in `CaminosModule` (or a dedicated `CountriesModule` if it grows). It does not require a DB table in V1.

---

## Backend Module Structure

### Delete `RoutesModule`
The existing `RoutesModule` (under `apps/backend/src/routes/` or equivalent) is an empty placeholder stub. The backend developer must:
1. Delete the module directory and all its files.
2. Remove any import of `RoutesModule` from `AppModule` or any other module.
3. Confirm no other code references it before deleting.

This is a prerequisite step before creating `CaminosModule`.

### Create `CaminosModule`
New module: `apps/backend/src/caminos/`

Contains:
- `CaminosController` — handles `POST /api/caminos` and `GET /api/caminos`
- `CaminoPointsController` — handles `GET /api/camino-points/search`
- `CountriesController` (or a route on `CaminosController`) — handles `GET /api/countries`
- `CaminosService` — business logic, transaction orchestration
- `CaminoPointsService` — search query logic
- DTOs: `CreateCaminoDto`, `CreateCaminoPointDto` (with conditional validation), `CaminoPointSearchQueryDto`
- Entity/type definitions

---

## Frontend Components

### Pages (already stubbed)
- `/caminos` — public list page; fetches `GET /api/caminos` via TanStack Query
- `/caminos/new` — protected; renders `CreateCaminoForm` after auth and role checks

### `CreateCaminoForm` component
- Uses **react-hook-form** for all form state management and validation.
  - `react-hook-form` must be added to `apps/frontend/package.json` (it is not currently installed).
  - Use `useFieldArray` from react-hook-form to manage the dynamic caminoPoints list.
- Each caminoPoint row carries internal state tracking whether it is in "existing point linked" mode or "new point" mode. This internal state is not a separate Zustand store — it lives in the form's field array values (e.g., a `caminoPointId` field that is either a UUID string or `null`).

#### Fields
- Camino name — `<Input>` (shadcn/ui), required
- Camino description — `<Textarea>` (shadcn/ui), optional
- CaminoPoints list — dynamic rows, each containing:
  - Name — `<Input>`, required (read-only if linked to an existing point)
  - Country — `<Select>` (shadcn/ui) populated from `GET /api/countries` via TanStack Query, required
  - Description — `<Input>`, optional (read-only if linked to an existing point)
  - **Inline suggestion UI** (conditional — see below)
  - Remove button
  - Reorder controls (up/down buttons; drag-and-drop is out of scope for V1)
- Add caminoPoint button
- Submit button

#### Inline duplicate suggestion UI
- Trigger: debounced call to `GET /api/camino-points/search?name=<query>&country=<country>` once both `name` and `country` fields in a row have values. Recommended debounce: 400–600 ms. Also fires on blur from the name field if both fields are populated.
- Display: renders beneath the name field for that row. Shows a card or highlighted box containing:
  - The matched point's `name` and `description`
  - Two buttons: "Yes, use this existing point" and "No, create a new one"
  - i18n keys: `caminos_new.suggestion.prompt`, `caminos_new.suggestion.yes`, `caminos_new.suggestion.no`
- If multiple results are returned (up to 5), show the first match only in V1, or list them as selectable options — backend developer and frontend developer to agree on the simpler approach.
- "Yes" action:
  - Sets `caminoPointId` in that row's field value to the selected point's `id`.
  - Populates `name` and `description` from the existing point.
  - Sets those inputs to read-only. Adds a small "unlink" affordance to let the user revert to "new point" mode.
- "No" action:
  - Dismisses the suggestion UI for that row.
  - Clears `caminoPointId` (keeps it `null`).
  - Leaves name/description inputs editable.
- If the user changes the name or country field after linking, the link is automatically broken (reset to "new point" mode) and the search fires again.

#### Submission payload construction
Before calling `POST /api/caminos`, the form maps its field array to the correct shape:
- Rows where `caminoPointId` is set: `{ caminoPointId }` only.
- Rows where `caminoPointId` is null: `{ name, country, description }` only.

#### Error and loading states
- On submission: submit button is disabled and shows a loading indicator while the mutation is in flight.
- On server error: display error message inline without clearing form values (react-hook-form `setError` or form-level error state).
- If the search endpoint fails: suppress the suggestion UI silently (do not block the form). Log a warning internally if a logging utility is available; no `console.log`.
- All labels, placeholders, and error messages use i18n keys under `caminos_new`.

### State management
- Server state (camino list, countries, camino-point search): TanStack Query
- Form state: react-hook-form (not Zustand, not ad-hoc `useState`)

---

## Edge Cases & Error Handling

| Scenario | Expected behavior |
|---|---|
| User visits `/caminos/new` unauthenticated | Redirect to Kinde login |
| Authenticated user without `pilgrim` role | "Not authorized" message rendered in place of the form |
| Empty camino name on submit | react-hook-form blocks submission, inline error on name field |
| CaminoPoint with no country selected | react-hook-form blocks submission, inline error on that row |
| Zero caminoPoints added | react-hook-form blocks submission, error message on the list |
| Backend returns 400 | Display error message on the form, retain all field values |
| Backend returns 409 (race condition duplicate) | Display a descriptive error ("A point with this name and country already exists — please use the suggestion UI to link to it"), retain all field values |
| Backend returns 500 or network timeout | Display generic error message, retain all field values |
| Country list fails to load | Dropdown shows error state; form is not submittable until resolved |
| Camino-point search endpoint fails | Suggestion UI is silently suppressed for that row; form remains fully functional |
| User types a name, sees suggestion, clicks "Yes", then edits the name | Link is automatically broken; row reverts to "new point" mode; search fires again |
| User links a point, then changes the country dropdown | Link is automatically broken; row reverts to "new point" mode; search fires again |
| POST body includes both `caminoPointId` and `name`/`country` for the same row | Backend returns 400 — mutually exclusive fields |
| POST body includes neither `caminoPointId` nor `name`/`country` for a row | Backend returns 400 — one of the two sets is required |
| `caminoPointId` in POST body does not exist in DB | Backend returns 400 with message indicating the ID is invalid |
| Search returns multiple matches (up to 5) | V1: show first match only (or list all as selectable — to be agreed by dev team) |

---

## Out of Scope

- Editing or deleting an existing camino (future ticket)
- CaminoStages (legs between points — future ticket)
- Accommodations and sights (future tickets)
- Camino verification flow (admin sets `verified = true` — future ticket)
- Filtering the camino list by verified status
- Drag-and-drop reordering of caminoPoints (up/down buttons are sufficient for V1)
- Showing more than one suggestion match in the inline UI (V1 shows first match; multi-select is a future enhancement)
- Editing a linked caminoPoint's description from within this form
- User-facing country management (adding/removing allowed countries)
- E2E tests for this ticket

---

## Dependencies

- Kinde `pilgrim` role must be created in the Kinde dashboard (admin task, out of scope)
- `RolesGuard` and `JwtAuthGuard` already exist in the backend
- `useUserStore().hasRole()` already exists in the frontend Zustand store
- `/caminos` and `/caminos/new` page stubs already exist in the frontend
- `react-hook-form` must be installed: `yarn workspace @pillyway/frontend add react-hook-form`

---

## Open Questions

All open questions are resolved. No blockers remain before implementation begins.

~~**1. V1 UX when a caminoPoint name already exists**~~
**RESOLVED:** Option B — inline suggestion UI. The form performs a debounced fuzzy search (`ILIKE`) once name and country are both populated. If a match is found, it presents the existing point's name and description and requires an explicit user choice: "Yes, use this existing point" or "No, create a new one." The backend accepts either an existing `caminoPointId` or a new `{ name, country, description }` per caminoPoint row.

~~**2. RoutesModule — what should happen to it?**~~
**RESOLVED:** Delete it. The backend developer must remove `RoutesModule` and all references to it as the first step before creating `CaminosModule`.

---

## Design / UX Notes

- Use shadcn/ui components throughout: `<Input>`, `<Textarea>`, `<Select>`, `<Button>`
- The dynamic caminoPoint list should visually feel like a card stack — each row clearly grouped with a visible boundary
- The inline suggestion UI should be visually distinct from the input fields (e.g., a highlighted info card) so the user understands it is a system message, not another input
- Reorder controls (up/down buttons) must be keyboard accessible
- The submit button must show a loading spinner while the mutation is in flight (shadcn/ui `Button` with `disabled` state)
- All text content goes through the `next-intl` `useTranslations` hook — no raw strings

---

## Definition of Done

### Backend
- [ ] `RoutesModule` deleted from the backend codebase; all references removed from `AppModule` and any other imports
- [ ] `CaminosModule` created under `apps/backend/src/caminos/` with `CaminosController`, `CaminoPointsController`, `CaminosService`, `CaminoPointsService`
- [ ] `GET /api/caminos` implemented and returns correct shape `{ id, name, description, verified }`
- [ ] `POST /api/caminos` implemented with `JwtAuthGuard` + `@Roles('pilgrim')` guard
- [ ] `POST /api/caminos` handles both existing-point (`caminoPointId`) and new-point (`name`, `country`, `description`) items per caminoPoint row in an atomic transaction
- [ ] `POST /api/caminos` rejects payloads where a row provides both `caminoPointId` and name/country, or neither — returns `400`
- [ ] `POST /api/caminos` returns `409` if a new-point row conflicts with an existing `(name, country)` DB record (race condition guard via unique constraint)
- [ ] `GET /api/camino-points/search?name=<query>&country=<country>` implemented — case-insensitive `ILIKE` on name, exact country match, max 5 results, returns `{ id, name, country, description }[]`
- [ ] `GET /api/countries` implemented and returns allowed country list
- [ ] `CreateCaminoDto`, `CreateCaminoPointDto` (with conditional validation for the two mutually exclusive shapes), and `CaminoPointSearchQueryDto` written with `class-validator` decorators
- [ ] `ValidationPipe` rejects invalid bodies with `400`
- [ ] Supabase migrations written for `caminos`, `camino_points` (unique constraint on `name, country`), and `camino_point_order` tables
- [ ] Unit tests written for `CaminosService` and `CaminoPointsService` (Jest)

### Frontend
- [ ] `react-hook-form` added to `apps/frontend/package.json` and installed
- [ ] `/caminos` page fetches camino list via TanStack Query and renders it
- [ ] `/caminos/new` redirects unauthenticated users to Kinde login
- [ ] `/caminos/new` shows "not authorized" for authenticated users without `pilgrim` role
- [ ] `CreateCaminoForm` built using **react-hook-form** (`useFieldArray` for dynamic caminoPoints list)
- [ ] Each caminoPoint row tracks internal linked/new state via a `caminoPointId` field value (UUID or null)
- [ ] Debounced `GET /api/camino-points/search` call fires when both name and country fields in a row have values; triggers on blur from name field
- [ ] Inline suggestion UI renders beneath the name field when results are returned; shows matched name and description plus "Yes" / "No" action buttons (i18n keys: `caminos_new.suggestion.prompt`, `.yes`, `.no`)
- [ ] "Yes" action links the row to the existing record (read-only name/description, `caminoPointId` set)
- [ ] "No" action dismisses suggestion and leaves row in new-point mode
- [ ] Changing name or country after linking automatically breaks the link
- [ ] Submission payload maps linked rows to `{ caminoPointId }` and new rows to `{ name, country, description }`
- [ ] Country dropdown populated from `GET /api/countries` via TanStack Query
- [ ] Client-side validation blocks submission for missing required fields; inline errors shown
- [ ] Successful submission redirects user to `/caminos`
- [ ] Form retains user input on server-side error; error message displayed inline
- [ ] Search endpoint failures silently suppress the suggestion UI without blocking the form
- [ ] All user-facing strings use i18n keys under `caminos` and `caminos_new` namespaces (DE + EN), including suggestion UI strings
- [ ] Unit tests written for `CreateCaminoForm` (Vitest + React Testing Library)

### General
- [ ] No `console.log` in production code paths
- [ ] Code reviewed and PR approved before merge to `main`
