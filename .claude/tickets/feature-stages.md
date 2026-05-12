---
id: PILLY-STG-001
title: "Introduce Stage entity — stage list, stage detail view, and stage edit form"
type: Feature
priority: High
status: Ready for implementation
last_updated: 2026-05-11
depends_on: PILLY-CAM-002
---

# PILLY-STG-001 — Introduce Stage entity: stage list, stage detail view, and stage edit form

**Type:** Feature
**Priority:** High — Stages are the primary navigational unit of a Camino. Without them, the
Camino detail view shows raw waypoints with no traversal context. Stages expose the meaningful
"leg-by-leg" structure that users actually need to plan a pilgrimage.
**Status:** Ready for implementation

---

## User Persona(s)

**Guest**
An unauthenticated visitor (or any authenticated user without the `pilgrim` role). Can view
Camino detail pages and Stage detail pages to browse route information. Has no write access. Sees
no Edit button anywhere in the stage views.

**Pilgrim (Route Editor)**
An authenticated user with the `pilgrim` Kinde role. Can view and edit stages — specifically the
`distance` and `description` fields. Cannot restructure a stage's start or end points (that is
handled by editing the parent Camino's CaminoPoint list). A Pilgrim can edit stages on **any**
Camino, not only those they created.

**Owner**
Root application admin. In Kinde, every user with the `owner` role is also assigned the `pilgrim`
role. Therefore owners can view and edit stages. The Edit button is visible to both pilgrims and
owners. There is no separate owner-role guard for stage editing — checking `pilgrim` is sufficient.

---

## User Stories

### US-1 — View stages on the Camino detail page
As any visitor, I want the Camino detail page to show a list of stages (with stage number, start
point, end point, and optional distance) instead of a plain waypoint list, so that I can
understand the route as a sequence of walkable legs.

### US-2 — View a stage's full detail
As any visitor, I want to click a stage and see its full detail page (start point, end point,
distance, description, and navigation to adjacent stages), so that I can evaluate an individual
leg before planning my day.

### US-3 — Edit a stage's distance and description
As a pilgrim, I want to open a stage edit form from the stage detail page and update its distance
and description, so that route data can be enriched or corrected over time.

---

## Context & Background

PILLY-CAM-001 established the `caminos` and `camino_points` tables and the `camino_point_order`
join table, which records the ordered list of CaminoPoints on a Camino (1-based `position`).
PILLY-CAM-002 added the public Camino detail page (`/caminos/[camino_id]`) which currently lists
CaminoPoints with their position numbers.

This ticket introduces the **Stage** concept. A Stage is not a standalone user-created entity; it
is derived from the CaminoPoint ordering:

- For a Camino with N CaminoPoints (positions 1…N), there are N−1 stages.
- Stage K connects CaminoPoint at position K (startPoint) to CaminoPoint at position K+1
  (endPoint).
- Stages are 1-based: stage 1 is between positions 1 and 2, stage 2 is between positions 2 and 3.

Because multiple Caminos can share the same pair of CaminoPoints, a Stage record is **globally
shared** and uniquely identified by `(startPointId, endPointId)`. Editing a shared Stage updates
it for every Camino that traverses the same start/end pair. This is the same reuse principle
already applied to CaminoPoints.

---

## Database Changes — Prisma Schema

A new `Stage` model must be added to `apps/backend/prisma/schema.prisma`. A Prisma migration is
required.

### New model: `Stage`

```prisma
model Stage {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  startPointId String   @map("start_point_id") @db.Uuid
  endPointId   String   @map("end_point_id") @db.Uuid
  distance     Float?
  description  String?
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  startPoint CaminoPoint @relation("StageStart", fields: [startPointId], references: [id])
  endPoint   CaminoPoint @relation("StageEnd", fields: [endPointId], references: [id])

  @@unique([startPointId, endPointId])
  @@map("stages")
}
```

The `CaminoPoint` model must also be updated to declare the back-relations:

```prisma
model CaminoPoint {
  // ... existing fields ...
  stagesAsStart Stage[] @relation("StageStart")
  stagesAsEnd   Stage[] @relation("StageEnd")
}
```

**Migration command (run locally by the developer):**
```bash
yarn prisma:migrate:dev --name add-stages
```

**Notes:**
- `distance` is `Float?` (optional, nullable). Stored in kilometres. No unit enforcement at the
  DB level.
- `createdAt` records when the Stage row was first created (i.e. when the first Camino that
  contains this point pair was saved). It is set once and never updated.
- `updatedAt` records the last time the Stage row was written (either on creation or after a
  successful PATCH). A stage where `updatedAt > createdAt` was enriched at some point, even if
  `distance` and `description` are now null again. Both timestamps are included in all API
  responses so that future maintenance tooling can identify orphaned Stage rows safely: orphaned
  + old `createdAt` + `updatedAt === createdAt` (never enriched) → safe to delete.
- The unique constraint on `(startPointId, endPointId)` enforces the reuse rule at the database
  level.
- No cascade delete is needed: if a CaminoPoint is deleted (which is out of scope), the default
  Prisma/PostgreSQL behaviour (restrict) is acceptable for now.
- `updatedAt` must be updated on every write. If Prisma's `@updatedAt` attribute is not used,
  pass `updatedAt: new Date()` explicitly in every update call.

---

## Backend API Contract

A new `StagesModule` must be created at `apps/backend/src/stages/`. The module registers
`StagesController` and `StagesService`. It must be imported into `AppModule`.

### 3.1 `GET /api/caminos/:caminoId/stages`

**Auth:** Public (no token required).

**Purpose:** Returns all stages for a given Camino in traversal order (stage 1 first).

**Path param:** `caminoId` — UUID string, validated by `ParseUUIDPipe`.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "stageNumber": 1,
    "startPoint": { "id": "uuid", "name": "Saint-Jean-Pied-de-Port", "country": "France" },
    "endPoint":   { "id": "uuid", "name": "Roncesvalles", "country": "Spain" },
    "distance": 24.7,
    "description": "The iconic first stage over the Pyrenees.",
    "createdAt": "2026-05-11T10:00:00.000Z",
    "updatedAt": "2026-05-11T14:32:00.000Z"
  },
  {
    "id": "uuid",
    "stageNumber": 2,
    "startPoint": { "id": "uuid", "name": "Roncesvalles", "country": "Spain" },
    "endPoint":   { "id": "uuid", "name": "Pamplona", "country": "Spain" },
    "distance": null,
    "description": null,
    "createdAt": "2026-05-11T10:00:00.000Z",
    "updatedAt": "2026-05-11T10:00:00.000Z"
  }
]
```

`stageNumber` is computed server-side as the 1-based index in the ordered CaminoPoint list.

**Response `404`:** Camino not found.
**Response `400`:** `caminoId` is not a valid UUID.

**Service method:** `StagesService.findByCamino(caminoId: string): Promise<StageListItem[]>`

**Implementation notes:**
1. Fetch the Camino's `camino_point_order` rows, ordered ascending by `position`. If the Camino
   does not exist or has zero rows, throw `NotFoundException('Camino not found.')`.
2. For each consecutive pair of CaminoPoints (position K and K+1), look up or derive the Stage
   record using `startPointId = points[K].id` and `endPointId = points[K+1].id`.
3. Stage records are fetched via a single Prisma query — **no N+1 queries**. Use the Prisma
   `where: { OR: pairs.map(p => ({ startPointId: p.startId, endPointId: p.endId })) }` pattern,
   which is bounded by the number of stages per Camino and efficient at current scale. Do not
   attempt a composite-`IN` SQL expression; Prisma has no native operator for it.
4. All Stage rows exist at this point because of eager creation in `CaminosService`. Every item
   in the response has a non-null `id`.

---

### 3.2 `GET /api/caminos/:caminoId/stages/:stageNumber`

**Auth:** Public (no token required).

**Purpose:** Returns the full detail for a single stage, identified by its 1-based number within
the Camino. Also returns adjacent stage summaries to support navigation.

**Path params:**
- `caminoId` — UUID string, validated by `ParseUUIDPipe`.
- `stageNumber` — positive integer (1-based). Validated with `ParseIntPipe`. Values < 1 or
  greater than the number of stages return `404`.

**Stage rows are always present (eager creation):**
Stage rows are created eagerly in `CaminosService.create()` and `CaminosService.update()` (see
section 3.4 below). By the time any GET request is made for a valid stageNumber, the Stage row
already exists. No lazy creation is needed in this endpoint.

**Response `200`:**
```json
{
  "id": "uuid",
  "stageNumber": 2,
  "startPoint": { "id": "uuid", "name": "Roncesvalles", "country": "Spain" },
  "endPoint":   { "id": "uuid", "name": "Pamplona", "country": "Spain" },
  "distance": null,
  "description": null,
  "createdAt": "2026-05-11T10:00:00.000Z",
  "updatedAt": "2026-05-11T10:00:00.000Z",
  "previousStage": {
    "stageNumber": 1,
    "startPointName": "Saint-Jean-Pied-de-Port",
    "endPointName": "Roncesvalles"
  },
  "nextStage": {
    "stageNumber": 3,
    "startPointName": "Pamplona",
    "endPointName": "Burgos"
  }
}
```

- `previousStage` is `null` when `stageNumber === 1`.
- `nextStage` is `null` when `stageNumber === totalStages`.
- Adjacent stage summaries only contain `stageNumber`, `startPointName`, and `endPointName` —
  not the full Stage record — to keep the payload lean.

**Response `404`:** Camino not found, or `stageNumber` out of range (< 1 or > N−1 where N is the
number of CaminoPoints on that Camino).
**Response `400`:** `caminoId` is not a valid UUID, or `stageNumber` is not a positive integer.

**Service method:** `StagesService.findOne(caminoId: string, stageNumber: number): Promise<StageDetail>`

---

### 3.3 `PATCH /api/caminos/:caminoId/stages/:stageNumber`

**Auth:** `JwtAuthGuard` required. Permitted for users with the `pilgrim` Kinde role. Because every
`owner` user in Kinde is also assigned the `pilgrim` role, checking `pilgrim` is sufficient —
owners can edit stages. Return `403` for any authenticated user who has neither role.

**Path params:** Same as `GET` above.

**Request body (all fields optional — at least one must be present):**
```json
{
  "distance": 24.7,
  "description": "Updated description text."
}
```

**Field rules:**
- `distance`: optional; positive number or `null` (sending `null` clears it); if present and not
  null must be `> 0` and `<= 9999.9` (km), with at most 1 decimal place (e.g. `24.7`). Use
  `@IsOptional()`, `@IsNumber({ maxDecimalPlaces: 1, allowNaN: false, allowInfinity: false })`,
  `@Min(0.1)`, `@Max(9999.9)`. The explicit `allowNaN: false` / `allowInfinity: false` flags are
  required because `typeof NaN === 'number'` — without them `NaN` passes the `@IsNumber` check
  and `NaN >= 0.1` evaluates to `false`, meaning `@Min` does not catch it. Unit is always km —
  no unit conversion in V1.
- `description`: optional; string or `null` (sending `null` clears it); max 5000 chars.
- If the request body is empty (`{}`), return `400`.

**Stage resolution on PATCH:**
The service resolves the Stage by deriving `startPointId` and `endPointId` from the Camino's
CaminoPoint order (same lookup as GET). Stage rows always exist after Camino creation/update
(eager creation — see section 3.4), so a plain `findUnique` on `(startPointId, endPointId)` is
sufficient. A defensive upsert fallback is still acceptable if the developer prefers robustness.

**Response `200`:** Same shape as `GET /api/caminos/:caminoId/stages/:stageNumber`.

**Response `400`:** Empty body or field constraint violation.
**Response `401`:** Missing or invalid JWT.
**Response `403`:** Authenticated but does not have the `pilgrim` role.
**Response `404`:** Camino not found or stageNumber out of range.

**Service method:** `StagesService.update(caminoId: string, stageNumber: number, dto: UpdateStageDto, userRoles: string[]): Promise<StageDetail>`

**NestJS implementation notes:**
- New DTO: `UpdateStageDto` with `@IsOptional()` on both fields and a class-level "at least one
  field" guard (`@ValidateIf` or custom `@AtLeastOneField()` decorator — reuse the pattern
  established in `UpdateCaminoDto`).
- Authorization check at the **service layer**: `if (!userRoles.includes('pilgrim')) throw new ForbiddenException()`. Do NOT use `@Roles('pilgrim')` on the route — consistent with the
  pattern from PILLY-CAM-002.
- `updatedAt` must be updated on every successful PATCH.
- Swagger decorators: `@ApiOkResponse`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`,
  `@ApiForbiddenResponse`, `@ApiNotFoundResponse`.

---

### 3.4 Eager Stage creation — `CaminosService` changes

Stage rows are created (or reused) automatically whenever a Camino's CaminoPoint list is written.
This avoids any lazy creation in GET endpoints and keeps reads clean.

**`CaminosService.create()`** — after saving the Camino and its CaminoPoint ordering, call
`stagesService.upsertStagePairs(pointIds, tx)` **inside the same `$transaction` block**, passing
the active transaction client `tx`. This ensures the stage upserts and the Camino write are
atomic — a partial failure rolls back both.

**`CaminosService.update()`** — after persisting the updated CaminoPoint ordering, call
`stagesService.upsertStagePairs(newPointIds, tx)` inside the same transaction. Pairs from the
old ordering that are no longer present are **not** deleted — Stage rows are globally shared and
may still be referenced by other Caminos.

**Service method** (in `StagesService`, called from `CaminosService`):
```typescript
async upsertStagePairs(
  pointIds: string[],
  tx: Prisma.TransactionClient,
): Promise<void>
```
Receives an ordered list of CaminoPoint IDs and the outer transaction client. Executes N−1
`tx.stage.upsert` calls within the caller's transaction — **never opens its own
`prisma.$transaction`**, because nested interactive transactions are not supported by Prisma and
would break atomicity with the enclosing Camino write.

---

### 3.5 Waypoint reorder — data visibility warning

**Problem:** Stage rows are globally shared by `(startPointId, endPointId)`. When a pilgrim
reorders (or adds/removes) waypoints via `UpdateCaminoForm`, some existing stage pairs leave the
Camino's derived sequence. Those Stage rows are **not deleted** — they persist in the DB and their
`distance`/`description` data is preserved. However, the data is no longer visible from this
Camino's stage list or detail views until the original ordering is restored.

**Approach:** The frontend detects this situation before the user saves and surfaces a confirmation
dialog. This is a **client-side only** concern — no new API endpoint is needed.

**Detection logic (in `UpdateCaminoForm`):**

1. The form already loads the current stage list via `useStages(caminoId)`. Each `StageListItem`
   includes `startPoint.id`, `endPoint.id`, `distance`, and `description`.
2. Compute the *current pairs* (from the loaded stage list) and the *new pairs* (from the current
   form state: consecutive `caminoPointId` values in the `caminoPoints` field array).
3. Find *departing pairs*: pairs present in current but absent in new.
4. A departing pair is considered to **have data** if `distance !== null || description !== null`.
5. If any departing pair has data, block the normal form submit and open a confirmation dialog
   instead.

**Warning dialog content (i18n keys in section below):**
- Title: `caminos_update.reorder_warning_title`
- Body: `caminos_update.reorder_warning_body` — includes a count of affected stages via
  `{count}` interpolation (e.g. "2 stage(s)"). Explains that data is preserved and will return
  if the original order is restored.
- Confirm button: `caminos_update.reorder_warning_confirm`
- Cancel button: `caminos_update.reorder_warning_cancel`

**After confirmation:** proceed with the normal `mutation.mutate(payload, ...)` call.
**After cancellation:** close the dialog, return to the form with no changes.

**No warning is shown** when:
- No waypoints are reordered (only new waypoints added to the end, or existing ones removed, where
  no stage with data is affected).
- All departing pairs have `distance: null` and `description: null` (no enrichment to lose
  visibility of).

---

## Frontend — Pages and Components

### 4.1 Camino detail page — replace waypoints section with stages list

**File to modify:** `apps/frontend/app/caminos/[camino_id]/components/CaminoDetail.tsx`

**Change:** Remove the `<section>` that renders the ordered `<ol>` of CaminoPoints. Replace it
with a `StageList` component (see below).

**Remove** the i18n keys `camino_detail.waypoints_heading` and `camino_detail.edit_waypoints` from
usage in `CaminoDetail`. These keys remain defined in the message files for now (they are used in
existing tests) but must no longer be rendered. The keys will be formally removed or repurposed
in a later ticket.

**Empty state:** When the Camino has 0 or 1 CaminoPoint (0 stages), render a paragraph with the
text key `camino_detail.no_stages`.

---

### 4.2 `StageList` component (new)

**File:** `apps/frontend/app/caminos/[camino_id]/components/StageList.tsx`

**Props:**
```typescript
interface StageListProps {
  caminoId: string;
}
```

**Behaviour:**
- Calls `useStages(caminoId)` (see new hook below).
- Shows a skeleton loader while loading.
- Shows `camino_detail.error_loading_stages` message on error.
- Shows `camino_detail.no_stages` when the returned array is empty.
- Renders an ordered list (`<ol>`) of stage rows. Each row contains:
  - Stage number (1-based, e.g. "1")
  - Start point name
  - A separator (e.g. "→")
  - End point name
  - Distance in km if `distance !== null` (formatted as e.g. "24.7 km")
  - The entire row is a link (`<a>` or Next.js `<Link>`) to
    `/caminos/[camino_id]/stages/[stageNumber]`.

---

### 4.3 Stage detail page — `/caminos/[camino_id]/stages/[stageNumber]`

**New files:**
- `apps/frontend/app/caminos/[camino_id]/stages/[stageNumber]/page.tsx` — server component
- `apps/frontend/app/caminos/[camino_id]/stages/[stageNumber]/components/StageDetail.tsx` — client
  component

**`page.tsx` (server component):**
- Accepts `{ params: { camino_id: string; stageNumber: string } }`.
- Generates metadata via `generateMetadata`: title from `stage_detail.meta_title`.
- Renders `<StageDetail caminoId={camino_id} stageNumber={Number(stageNumber)} />`.
- Auth: page is **public** — no redirect, no role check at the page level.

**`StageDetail` (client component):**
- Calls `useStage(caminoId, stageNumber)`.
- Shows skeleton loader while loading, error state on failure.
- Renders:
  - **Back button** — a link (`←` arrow or icon + label from `stage_detail.back_to_camino`)
    navigating to `/caminos/[camino_id]`.
  - **Stage number heading** — e.g. "Stage 3" (i18n key `stage_detail.stage_number` with
    `{number}` interpolation).
  - **Start point** — name and country.
  - **End point** — name and country.
  - **Distance** — formatted value (e.g. "24.7 km") or placeholder
    (`stage_detail.distance_unknown`) when `null`.
  - **Description** — text content or placeholder (`stage_detail.no_description`) when `null`.
  - **Previous stage button** — visible only when `previousStage !== null`. Shows a left-arrow
    icon, the previous stage's start point name, and end point name. Links to
    `/caminos/[camino_id]/stages/[previousStage.stageNumber]`.
  - **Next stage button** — visible only when `nextStage !== null`. Shows the next stage's start
    point name and end point name, and a right-arrow icon. Links to
    `/caminos/[camino_id]/stages/[nextStage.stageNumber]`.
  - **Edit button** — visible to users with the `pilgrim` role (which includes all `owner` users
    in Kinde). Check via `useUserStore((s) => s.hasRole('pilgrim'))` or equivalent. Label from
    `stage_detail.edit`. Links to `/caminos/[camino_id]/stages/[stageNumber]/edit`.

---

### 4.4 Stage edit form — `/caminos/[camino_id]/stages/[stageNumber]/edit`

**New files:**
- `apps/frontend/app/caminos/[camino_id]/stages/[stageNumber]/edit/page.tsx` — server or client
  component (see auth notes below)
- `apps/frontend/app/caminos/[camino_id]/stages/[stageNumber]/edit/components/StageEditForm.tsx`
  — client component

**`page.tsx` auth gate:**
- Redirect unauthenticated users to `/api/auth/login` (use `getKindeServerSession()` on the
  server, or a client-side redirect hook — developer's choice based on the established pattern in
  the codebase).
- If authenticated but does not have the `pilgrim` role, render `<AccessDenied />` (same
  component used in the camino update page).
- If authenticated and has `pilgrim` role, render `<StageEditForm caminoId={camino_id} stageNumber={Number(stageNumber)} />`.

**`StageEditForm` (client component):**
- Calls `useStage(caminoId, stageNumber)` to load current values. Shows loading skeleton while
  fetching.
- **Read-only display:** Start point name + country and end point name + country. These are NOT
  editable in this form. Use static text or a visually distinct read-only style.
- **Editable fields** (using react-hook-form):
  - `distance` — number input (`<Input type="number" step="0.1" min="0.1" max="9999.9" />`),
    optional. Pre-populated from the current stage value. Label: `stage_edit.field_distance`.
    Hint text (below the input): `stage_edit.field_distance_hint` (e.g. "Distance in km").
    Clearing the input sets the value to `null` (send `null` in the payload to clear).
  - `description` — textarea, optional. Pre-populated from the current stage value. Label:
    `stage_edit.field_description`. Clearing the textarea sets the value to `null`.
- **Save button** (`stage_edit.submit`) — submits changes. On success, navigates to
  `/caminos/[camino_id]/stages/[stageNumber]`. Displays loading state while the request is in
  flight.
- **Cancel button** (`stage_edit.cancel`) — discards changes (no mutation), navigates back to
  `/caminos/[camino_id]/stages/[stageNumber]`.
- **Error handling:** On mutation failure, show an inline error message
  (`stage_edit.error_generic`). Retain form state. Do not navigate away.

---

### 4.5 New API hooks

All new hooks follow the existing pattern in `apps/frontend/app/api/`.

**`use-stages.ts`** (new — list):
```typescript
// Exports: fetchStages(caminoId), useStages(caminoId)
// Query key: ['stages', caminoId]
// Endpoint: GET /api/caminos/:caminoId/stages
// Auth: none (public)
// Disabled when caminoId is empty string
// Return type: StageListItem[]
```

**`use-stage.ts`** (new — single):
```typescript
// Exports: fetchStage(caminoId, stageNumber), useStage(caminoId, stageNumber)
// Query key: ['stage', caminoId, stageNumber]
// Endpoint: GET /api/caminos/:caminoId/stages/:stageNumber
// Auth: none (public)
// Disabled when caminoId is empty string or stageNumber < 1
// Return type: StageDetail
```

**`use-update-stage.ts`** (new):
```typescript
// Exports: updateStage(caminoId, stageNumber, payload, token), useUpdateStage()
// Mutation via useMutation
// Endpoint: PATCH /api/caminos/:caminoId/stages/:stageNumber
// Auth: Bearer token from useKindeBrowserClient().accessTokenEncoded
// Payload type: UpdateStagePayload { distance?: number | null; description?: string | null }
// Returns: StageDetail
// Error: throws with { status } attached (same pattern as use-update-camino.ts)
```

**Shared TypeScript types** — define in `apps/frontend/app/api/stage-types.ts` and import from
all three hooks (do not duplicate):
```typescript
export interface StagePointSummary {
  id: string;
  name: string;
  country: string;
}

export interface AdjacentStageSummary {
  stageNumber: number;
  startPointName: string;
  endPointName: string;
}

export interface StageListItem {
  id: string;
  stageNumber: number;
  startPoint: StagePointSummary;
  endPoint: StagePointSummary;
  distance: number | null;
  description: string | null;
  createdAt: string; // ISO 8601 — when the stage pair was first created
  updatedAt: string; // ISO 8601 — last enrichment; equals createdAt if never enriched
}

export interface StageDetail {
  id: string;
  stageNumber: number;
  startPoint: StagePointSummary;
  endPoint: StagePointSummary;
  distance: number | null;
  description: string | null;
  createdAt: string; // ISO 8601 — when the stage pair was first created
  updatedAt: string; // ISO 8601 — last enrichment; equals createdAt if never enriched
  previousStage: AdjacentStageSummary | null;
  nextStage: AdjacentStageSummary | null;
}
```

---

## i18n Keys

All keys must be added to both `apps/frontend/i18n/messages/en.json` and
`apps/frontend/i18n/messages/de.json`.

### New keys under `camino_detail` namespace

| Key | EN value | DE value |
|---|---|---|
| `camino_detail.stages_heading` | `"Stages"` | `"Etappen"` |
| `camino_detail.no_stages` | `"This camino has no stages yet. Add at least two waypoints to generate stages."` | `"Dieser Camino hat noch keine Etappen. Füge mindestens zwei Wegpunkte hinzu, um Etappen zu erzeugen."` |
| `camino_detail.error_loading_stages` | `"Failed to load stages. Please try again."` | `"Etappen konnten nicht geladen werden. Bitte versuche es erneut."` |

### New keys under `caminos_update` namespace (reorder warning dialog)

| Key | EN value | DE value |
|---|---|---|
| `caminos_update.reorder_warning_title` | `"Waypoint order changed"` | `"Reihenfolge der Wegpunkte geändert"` |
| `caminos_update.reorder_warning_body` | `"{count, plural, one {1 stage has} other {# stages have}} distance or description data that will no longer appear in this Camino after saving. The data is not deleted — it will return if you restore the original order."` | `"{count, plural, one {1 Etappe hat} other {# Etappen haben}} Entfernungs- oder Beschreibungsdaten, die nach dem Speichern in diesem Camino nicht mehr sichtbar sind. Die Daten werden nicht gelöscht — sie erscheinen wieder, wenn du die ursprüngliche Reihenfolge wiederherstellst."` |
| `caminos_update.reorder_warning_confirm` | `"Save anyway"` | `"Trotzdem speichern"` |
| `caminos_update.reorder_warning_cancel` | `"Go back"` | `"Zurück"` |

### New namespace `stage_detail`

| Key | EN value | DE value |
|---|---|---|
| `stage_detail.meta_title` | `"Stage {number} | Pillyway"` | `"Etappe {number} | Pillyway"` |
| `stage_detail.meta_description` | `"View the details of stage {number} of this pilgrimage route."` | `"Sieh dir die Details von Etappe {number} dieser Pilgerroute an."` |
| `stage_detail.stage_number` | `"Stage {number}"` | `"Etappe {number}"` |
| `stage_detail.back_to_camino` | `"Back to camino"` | `"Zurück zum Camino"` |
| `stage_detail.distance_unknown` | `"Distance not set"` | `"Entfernung nicht angegeben"` |
| `stage_detail.no_description` | `"No description provided."` | `"Keine Beschreibung vorhanden."` |
| `stage_detail.edit` | `"Edit stage"` | `"Etappe bearbeiten"` |
| `stage_detail.previous_stage_aria` | `"Go to previous stage: {start} to {end}"` | `"Zur vorherigen Etappe: {start} bis {end}"` |
| `stage_detail.next_stage_aria` | `"Go to next stage: {start} to {end}"` | `"Zur nächsten Etappe: {start} bis {end}"` |
| `stage_detail.error_loading` | `"Failed to load stage. Please try again."` | `"Etappe konnte nicht geladen werden. Bitte versuche es erneut."` |

### New namespace `stage_edit`

| Key | EN value | DE value |
|---|---|---|
| `stage_edit.title` | `"Edit Stage {number}"` | `"Etappe {number} bearbeiten"` |
| `stage_edit.meta_title` | `"Edit Stage {number} | Pillyway"` | `"Etappe {number} bearbeiten | Pillyway"` |
| `stage_edit.meta_description` | `"Edit the distance and description of this stage."` | `"Entfernung und Beschreibung dieser Etappe bearbeiten."` |
| `stage_edit.start_point_label` | `"Start point"` | `"Startpunkt"` |
| `stage_edit.end_point_label` | `"End point"` | `"Endpunkt"` |
| `stage_edit.field_distance` | `"Distance (km)"` | `"Entfernung (km)"` |
| `stage_edit.field_distance_hint` | `"Optional. Enter the distance in kilometres."` | `"Optional. Entfernung in Kilometern eingeben."` |
| `stage_edit.field_description` | `"Description (optional)"` | `"Beschreibung (optional)"` |
| `stage_edit.submit` | `"Save changes"` | `"Änderungen speichern"` |
| `stage_edit.submitting` | `"Saving…"` | `"Wird gespeichert…"` |
| `stage_edit.cancel` | `"Cancel"` | `"Abbrechen"` |
| `stage_edit.access_denied` | `"You do not have permission to edit stages. The pilgrim or owner role is required."` | `"Du hast keine Berechtigung, Etappen zu bearbeiten. Die Pilgrim- oder Owner-Rolle ist erforderlich."` |
| `stage_edit.error_generic` | `"Failed to save changes. Please try again."` | `"Änderungen konnten nicht gespeichert werden. Bitte versuche es erneut."` |
| `stage_edit.error_forbidden` | `"You are not authorized to edit this stage."` | `"Du bist nicht berechtigt, diese Etappe zu bearbeiten."` |
| `stage_edit.error_loading` | `"Failed to load stage data for editing."` | `"Etappendaten konnten nicht zum Bearbeiten geladen werden."` |

---

## Use Case Descriptions

### UC-1 — Browse stages from the Camino detail page

1. Any visitor navigates to `/caminos/[camino_id]`.
2. The `StageList` client component mounts and calls `GET /api/caminos/:caminoId/stages` via
   the `useStages` TanStack Query hook. **This is a client-side fetch that runs after hydration,
   not a server-side data fetch.** Stage names are therefore absent from the initial HTML payload.
   This is a conscious trade-off: stage content is not considered high-priority SEO content for
   V1. If that changes, move the data fetch to `page.tsx` using `fetchStages()` directly and pass
   the result as a prop to a server-rendered `StageList`.
3. The stages section renders an ordered list. Each row shows: stage number, start point name,
   "→", end point name, and distance if populated.
4. Clicking a stage row navigates to `/caminos/[camino_id]/stages/[stageNumber]`.
5. If the Camino has fewer than 2 CaminoPoints, the stages section renders the empty-state
   message `camino_detail.no_stages`.

### UC-2 — View a stage's full detail

1. Any visitor clicks a stage row or navigates directly to
   `/caminos/[camino_id]/stages/[stageNumber]`.
2. The `StageDetail` client component calls `GET /api/caminos/:caminoId/stages/:stageNumber`.
   The Stage row always exists at this point (eager creation on Camino save).
3. The page renders: stage number heading, start point (name + country), end point (name +
   country), distance or placeholder, description or placeholder.
4. Navigation row: previous stage button (if stage > 1), next stage button (if not the last
   stage). Each button shows the adjacent stage's start/end point names.
5. Back button navigates to `/caminos/[camino_id]`.
6. A user with the `pilgrim` role (including all `owner` users) additionally sees an "Edit stage"
   button linking to `/caminos/[camino_id]/stages/[stageNumber]/edit`. Guests see no edit button.

### UC-3 — Edit a stage's distance and description

1. A pilgrim clicks "Edit stage" on the stage detail page.
2. The browser navigates to `/caminos/[camino_id]/stages/[stageNumber]/edit`.
3. The server component checks auth — redirects unauthenticated visitors to login; renders
   `<AccessDenied />` for authenticated non-pilgrims.
4. The `StageEditForm` loads, shows the start/end point names as read-only, and pre-populates
   the distance and description fields with current values.
5. The pilgrim edits one or both fields and clicks "Save changes".
6. The frontend sends `PATCH /api/caminos/:caminoId/stages/:stageNumber` with the changed values.
7. On success: navigate back to `/caminos/[camino_id]/stages/[stageNumber]`. Invalidate **both**
   TanStack Query cache keys: `['stage', caminoId, stageNumber]` (detail view) and
   `['stages', caminoId]` (stage list on the Camino detail page — so the distance column updates).
8. On error: display inline error message, retain form state.

### UC-4 — Reorder waypoints when stages have data

1. A pilgrim opens `UpdateCaminoForm` for a Camino with enriched stages (distance or description
   set on one or more stage pairs).
2. The pilgrim changes the waypoint order (e.g. moves waypoint B above waypoint A, or inserts a
   new waypoint between two existing ones).
3. The pilgrim clicks "Save changes".
4. The frontend computes which current stage pairs will leave the sequence. It finds that N of those
   departing pairs have `distance !== null` or `description !== null`.
5. Instead of submitting immediately, a confirmation dialog is shown with:
   - Title: `caminos_update.reorder_warning_title`
   - Body: `caminos_update.reorder_warning_body` (with `{count}` = N)
   - Two buttons: `reorder_warning_confirm` and `reorder_warning_cancel`
6a. If the pilgrim clicks **"Save anyway"**: the form submits normally. The Camino is saved with the
    new point order. The old stage pairs are no longer in the sequence but their rows and data
    persist in the DB.
6b. If the pilgrim clicks **"Go back"**: the dialog closes, the form is unchanged, no request is
    sent.
7. **No dialog is shown** when no departing stage pairs have data — the form saves immediately as
   before.

---

## Acceptance Criteria

### Camino detail — stages list

- [ ] Given a Camino with 3 CaminoPoints, the detail page renders exactly 2 stage rows under the stages heading.
- [ ] Each stage row shows: stage number (1, 2…), start point name, end point name, and distance if set.
- [ ] Each stage row is a clickable link that navigates to the stage detail page.
- [ ] Given a Camino with 1 or 0 CaminoPoints, the stages section shows the `camino_detail.no_stages` message and no stage rows.
- [ ] The raw waypoints `<ol>` list is no longer rendered on the Camino detail page.

### Stage detail page

- [ ] Given: a guest visits `/caminos/[id]/stages/1`. Then: the page renders without an Edit button.
- [ ] Given: a pilgrim (or owner, who also holds the pilgrim role) visits the same page. Then: an "Edit stage" button is visible and links to `/caminos/[id]/stages/1/edit`.
- [ ] Given: stage 1 of a Camino with 3 stages is displayed. Then: there is no previous stage button and there is a next stage button showing "Stage 2" start/end names.
- [ ] Given: stage 2 of a Camino with 3 stages is displayed. Then: both previous and next stage buttons are visible with the correct start/end names.
- [ ] Given: stage 3 of a Camino with 3 stages is displayed. Then: there is no next stage button.
- [ ] Given: `distance` is null. Then: the distance placeholder `stage_detail.distance_unknown` is shown.
- [ ] Given: `description` is null. Then: the description placeholder `stage_detail.no_description` is shown.
- [ ] The Back button navigates to `/caminos/[camino_id]`.
- [ ] Given: an invalid `stageNumber` (e.g. 0, negative, or beyond the total stage count) is supplied. Then: the backend returns 404 and the frontend renders the `stage_detail.error_loading` error state.

### Stage edit form

- [ ] Given: an unauthenticated user navigates to `/caminos/[id]/stages/1/edit`. Then: they are redirected away from the edit page (to the Kinde login flow).
- [ ] Given: an authenticated user without the `pilgrim` role navigates to the edit page. Then: the `<AccessDenied />` component is rendered, not the edit form.
- [ ] Given: a pilgrim opens the edit form. Then: the start and end point names are displayed as read-only (not editable inputs).
- [ ] Given: a pilgrim sets a valid distance and description and clicks Save. Then: the form submits, navigates back to the stage detail page, and the detail page shows the updated values.
- [ ] Given: a pilgrim clears the distance field and saves. Then: `distance` is sent as `null` in the PATCH payload; the stage detail page shows `stage_detail.distance_unknown` after redirect.
- [ ] Given: a pilgrim clicks Cancel. Then: no PATCH request is fired and the browser navigates back to the stage detail page.
- [ ] Given: a PATCH request fails (e.g. network error). Then: the form shows `stage_edit.error_generic`, form state is retained, and no navigation occurs.

### Backend authorization

- [ ] Given: a PATCH request is sent with a valid `pilgrim` JWT. Then: the response is 200 with the updated StageDetail.
- [ ] Given: a PATCH request is sent with a JWT that has neither `pilgrim` nor `owner` role. Then: the response is 403.
- [ ] Given: a PATCH request is sent with no JWT. Then: the response is 401.
- [ ] Given: a GET request is sent with no JWT. Then: the response is 200 (public).

> **Note:** There is no test for "owner without pilgrim" because in Kinde every `owner` user is also assigned `pilgrim`. A role-only guard testing that scenario would test a state that cannot occur in production.

### Waypoint reorder warning

- [ ] Given: a pilgrim reorders waypoints on a Camino where at least one departing stage pair has `distance` or `description` set. When: "Save changes" is clicked. Then: a confirmation dialog appears before the request is sent.
- [ ] Given: the dialog is shown. When: the pilgrim clicks "Save anyway". Then: the Camino is saved with the new ordering; the old stage data is no longer visible in the Camino's stage list.
- [ ] Given: the dialog is shown. When: the pilgrim clicks "Go back". Then: no request is sent; the form is unchanged and the dialog closes.
- [ ] Given: a pilgrim reorders waypoints but all departing stage pairs have `distance: null` and `description: null`. Then: no dialog is shown and the form saves immediately.
- [ ] Given: a pilgrim adds a new waypoint to the end without changing any existing positions. Then: no departing pairs with data exist, no dialog is shown.
- [ ] Given: the dialog body includes `{count}`. Then: it shows the correct number of affected stages (e.g. "2 stages have distance or description data…").

### Shared stage reuse

- [ ] Given: two Caminos both have CaminoPoints A → B → C. Then: they share the same Stage records for A→B and B→C. A PATCH on that stage from one Camino's context updates the description that is also visible from the other Camino's context.
- [ ] Given: a Camino's waypoints are reordered so that the A→B pair leaves the sequence. Then: the A→B Stage row still exists in the DB with its `distance`/`description` intact. If the ordering is restored, the data reappears in the stage list.

---

## Edge Cases & Error Handling

| Scenario | Expected behavior |
|---|---|
| Camino with 0 CaminoPoints — `GET /api/caminos/:id/stages` | Returns `[]`. Frontend shows `camino_detail.no_stages`. |
| Camino with 1 CaminoPoint — `GET /api/caminos/:id/stages` | Returns `[]`. Same empty state. |
| `stageNumber` of 0 or negative — `GET /api/caminos/:id/stages/0` | Backend: `404`. Frontend: `stage_detail.error_loading` error state. |
| `stageNumber` exceeds total stages — e.g. stages/99 on a 2-stage camino | Backend: `404`. Frontend: error state. |
| `stageNumber` is not an integer — e.g. stages/foo | Backend: `400` (ParseIntPipe). Frontend: error state. |
| Shared stage: pilgrim PATCHes a stage shared by two Caminos | Update succeeds; distance and description change is reflected when both Caminos' stage detail pages are loaded. |
| Pilgrim sends `distance: 0` | Backend: `400` (Min(0.1) constraint). Frontend shows `stage_edit.error_generic`. |
| Pilgrim sends `distance: 10000` | Backend: `400` (Max(9999.9) constraint). Frontend shows `stage_edit.error_generic`. |
| PATCH with empty body `{}` | Backend: `400`. Frontend shows `stage_edit.error_generic`. |
| `GET /api/caminos/:id/stages/:n` — Camino does not exist | Backend: `404`. Frontend: `stage_detail.error_loading`. |
| Owner visits `/caminos/[id]/stages/1/edit` | Server component renders `<AccessDenied />` — same component used in `/caminos/[id]/update`. |
| Unauthenticated visitor visits stage edit page | Server component redirects to `/api/auth/login`. |
| Stage detail page requested for a valid stageNumber | Stage row always exists (eager creation on Camino save). Response contains non-null `id`, `distance: null`, `description: null` if never enriched. Page renders placeholders without error. |
| Network failure when loading stage list on Camino detail | `StageList` renders `camino_detail.error_loading_stages`. Camino name, description, and other sections remain visible. |
| Browser back/forward navigation between stage detail pages | Page content updates correctly (TanStack Query re-fetches on navigation; query key includes `stageNumber`). |

---

## Out of Scope

- Creating or deleting Stage records explicitly by the user — stages are created eagerly on Camino
  save and structurally determined by the Camino's CaminoPoint order.
- Editing a stage's start or end CaminoPoints — endpoint assignment is changed by editing the
  parent Camino's CaminoPoint list via the existing `/caminos/[id]/update` flow.
- Displaying a stage on a map.
- Elevation profile per stage.
- Accommodation or sights linked to a stage.
- Reviews on stages.
- Drag-and-drop or reordering of stages (order is always derived from CaminoPoint positions).
- Bulk edit of multiple stages at once.
- Verifying stages (a future admin/owner flow).
- Deleting stages from the UI — a stage is implicitly removed when its start or end CaminoPoint
  is removed from the parent Camino's ordered list.
- Changing `distance` units — km is the single unit for V1.

---

## Dependencies

- **PILLY-CAM-002** must be merged before implementation begins. The Camino detail page
  (`/caminos/[camino_id]`), `useCamino` hook, `CaminoDetailFull` response type, `JwtAuthGuard`,
  `RolesGuard`, `AccessDenied` component, and `useUserStore` with `hasRole()` are all required
  by this ticket and must already exist.
- The `CaminoPointOrder` (alias `camino_point_order`) table and all existing Prisma relations are
  already in place.
- A Prisma migration is required to add the `stages` table. The developer must run
  `yarn prisma:migrate:dev --name add-stages` locally and commit the generated migration file.
- `PrismaModule` / `PrismaService` are already globally available — no changes needed.
- No new shadcn/ui components are required beyond what is already installed. If a left/right
  arrow icon is needed in the navigation row, use the existing `lucide-react` library (already a
  dependency via shadcn/ui) — e.g. `ChevronLeft` / `ChevronRight`.
- react-hook-form is already installed (established in PILLY-CAM-001).

---

## Test Plan

### Backend — unit tests (Jest, mock `PrismaService`)

All tests live in `apps/backend/src/stages/` alongside the service and controller.

**`StagesService.findByCamino`:**
- Returns an ordered array of `StageListItem` objects for a Camino with multiple CaminoPoints.
- Returns an empty array when the Camino has fewer than 2 CaminoPoints.
- All returned items have a non-null `id` (eager creation guarantees rows always exist).
- Throws `NotFoundException` when the Camino does not exist.

**`StagesService.findOne`:**
- Returns `StageDetail` with correct `previousStage: null` for stage 1.
- Returns `StageDetail` with correct `nextStage: null` for the final stage.
- Returns `StageDetail` with both adjacent summaries populated for a middle stage.
- Throws `NotFoundException` when `stageNumber` is out of range (0, negative, or > N−1).
- Throws `NotFoundException` when the Camino does not exist.

**`StagesService.update`:**
- Updates `distance` and returns updated `StageDetail` when user has `pilgrim` role.
- Updates `distance` to `null` (clears it) and returns updated `StageDetail`.
- Updates `description` to `null` (clears it) and returns updated `StageDetail`.
- **Cross-Camino visibility:** given two Caminos that share the same `(startPointId, endPointId)`
  pair, PATCHing the stage via Camino A's context and then calling `findOne` or `findByCamino`
  with Camino B's context returns the updated `distance` / `description`. This is the key
  correctness guarantee of the shared-stage model.
- Throws `ForbiddenException` when the user has no role (neither `pilgrim` nor `owner`).
- Throws `NotFoundException` when the Camino does not exist or `stageNumber` is out of range.
- Throws `BadRequestException` (via DTO validation) when `distance: 0` is supplied.
- Throws `BadRequestException` (via DTO validation) when `distance: NaN` is supplied.
- Throws `BadRequestException` (via DTO validation) when the payload is empty `{}`.

**`StagesService.upsertStagePairs`:**
- N=0 or N=1 point IDs: no upsert calls are made (no consecutive pairs).
- N=2 point IDs: exactly one `tx.stage.upsert` call is made.
- N=3 point IDs: exactly two upsert calls are made, in the correct (A→B, B→C) order.
- Existing Stage row is returned unchanged (no duplicate created) when called a second time with
  the same pair.
- A Prisma error from one upsert propagates out of the method (caller's transaction rolls back).

**`StagesController` handler tests:**
- `GET /caminos/:caminoId/stages` — delegates to `findByCamino`, returns 200 with array.
- `GET /caminos/:caminoId/stages/:n` — delegates to `findOne`, returns 200 with `StageDetail`.
- `PATCH /caminos/:caminoId/stages/:n` — returns 200 for pilgrim; returns 403 when service throws
  `ForbiddenException` (user has no pilgrim/owner role); returns 404 when service throws
  `NotFoundException`.
- DTO validation: `UpdateStageDto` with empty body returns 400; `distance: 0` returns 400;
  `distance: 10000` returns 400.

### Frontend — unit tests (Vitest + React Testing Library)

**`useStages` hook (`use-stages.test.ts`):**
- Returns `StageListItem[]` on successful fetch.
- Returns error state on network failure.

**`useStage` hook (`use-stage.test.ts`):**
- Returns `StageDetail` on successful fetch.
- Returns error state on 404.

**`useUpdateStage` hook (`use-update-stage.test.ts`):**
- Sends `PATCH` with correct headers, URL, and body.
- Attaches `{ status }` to thrown error on non-ok response.

**`StageList` component (`StageList.test.tsx`):**
- Renders N−1 rows for a Camino with N points.
- Renders `camino_detail.no_stages` when the list is empty.
- Each row contains start point name, end point name, and a link to the stage detail URL.
- Shows distance when set; omits it when null.

**`StageDetail` component (`StageDetail.test.tsx`):**
- Renders start point, end point, distance, and description.
- Shows `stage_detail.distance_unknown` placeholder when `distance` is null.
- Shows `stage_detail.no_description` placeholder when `description` is null.
- Renders Edit button for users with `pilgrim` role (owners always hold pilgrim, so they also see it).
- Does NOT render Edit button for guests or users without `pilgrim`/`owner` role.
- Renders previous stage button only when `previousStage !== null`.
- Renders next stage button only when `nextStage !== null`.
- Previous and next buttons display correct start/end names and link to the correct URL.
- Back button links to `/caminos/[caminoId]`.

**`StageEditForm` component (`StageEditForm.test.tsx`):**
- Pre-populates `distance` and `description` fields from the loaded stage.
- Start and end point names are rendered as read-only (not editable inputs).
- Clicking Cancel fires no mutation and triggers navigation to the stage detail page.
- Submitting with valid data fires the `useUpdateStage` mutation with the correct payload.
- On mutation error, renders `stage_edit.error_generic` and does not navigate.
- Clearing the distance field sends `distance: null` in the payload.

**`UpdateCaminoForm` reorder-warning behaviour (`UpdateCaminoForm.test.tsx` additions):**
- Given: current stages include one pair with `distance: 24.7`; the user moves that pair out of the
  new sequence. When "Save changes" is clicked, a dialog appears with the
  `caminos_update.reorder_warning_title` heading.
- Given: the dialog is open. When the user clicks `reorder_warning_confirm`, the mutation is
  called with the new payload.
- Given: the dialog is open. When the user clicks `reorder_warning_cancel`, no mutation is called
  and the dialog closes.
- Given: no departing stage pair has data. When "Save changes" is clicked, no dialog appears and
  the mutation fires immediately.
- The dialog body interpolates `{count}` correctly (singular and plural).

### E2E — Playwright

All E2E tests live in `apps/e2e/tests/`. A new file `stages.spec.ts` must be created.

Tests assume: at least one seeded Camino with at least 3 CaminoPoints, a test account with the
`pilgrim` role, and environment variables `E2E_PILGRIM_EMAIL` / `E2E_PILGRIM_PASSWORD`.

Missing environment variables must cause test failure with `expect(value, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy()` — never `test.skip()`.

**Guest / public tests:**

| Test | Assertion |
|---|---|
| Guest can view stages list on Camino detail page | Navigate to `/caminos`, click a camino, assert at least one stage row is visible. |
| Guest can navigate to stage detail page | Click first stage row, assert URL matches `/caminos/:id/stages/1` and stage number heading is visible. |
| Guest sees no Edit button on stage detail page | Assert no element with text "Edit stage" is visible. |
| Stage navigation buttons work | On stage 1, assert no previous button; click next stage button, assert URL changes to stage 2. |
| Back button returns to Camino detail | On stage detail page, click Back, assert URL is `/caminos/:id`. |
| Unauthenticated visitor redirected from edit page | Navigate directly to `/caminos/:id/stages/1/edit` without auth, assert URL is no longer the edit page. |

**Pilgrim tests (require `E2E_PILGRIM_EMAIL` / `E2E_PILGRIM_PASSWORD`):**

| Test | Assertion |
|---|---|
| Pilgrim sees Edit button on stage detail page | Log in as pilgrim, navigate to a stage detail page, assert "Edit stage" button is visible. |
| Pilgrim can open stage edit form | Click "Edit stage", assert URL is `/caminos/:id/stages/1/edit` and the form renders start/end points as read-only. |
| Pilgrim can set distance and save | Enter a distance value, click Save, assert redirect to stage detail page, assert new distance is displayed. |
| Pilgrim can clear distance | Set a distance, save, then re-open edit and clear the field, save again, assert `stage_detail.distance_unknown` is shown. |
| Pilgrim can set description and save | Enter description text, save, assert redirect and text is displayed on detail page. |
| Cancel from edit form returns to stage detail | Click Cancel on edit form, assert no change and URL is back on the stage detail page. |
| Shared stage: PATCH on Camino A is visible on Camino B | Log in as pilgrim; set distance on stage 1 of Camino A (which shares point pair A→B with Camino B); navigate to the same stage via Camino B's URL; assert the updated distance is displayed. |
| Pilgrim sees reorder warning when stage has data | Open update form for camino with enriched stage; reorder a waypoint; click Save; assert warning dialog appears. |
| Confirming reorder warning saves the camino | Click "Save anyway" in the dialog; assert the camino is saved and the stages list reflects the new order. |
| Cancelling reorder warning returns to form | Click "Go back" in the dialog; assert URL is still the update form and no change is visible in the stage list. |

---

## Definition of Done

### Backend

- [ ] Prisma schema updated with the `Stage` model (including relations to `CaminoPoint`) and the
  back-relations on `CaminoPoint`.
- [ ] Migration file generated via `yarn prisma:migrate:dev --name add-stages` and committed.
- [ ] `StagesModule` created at `apps/backend/src/stages/` and imported into `AppModule`.
- [ ] `GET /api/caminos/:caminoId/stages` implemented with `ParseUUIDPipe`, returns ordered
  `StageListItem[]`, empty array for <2 CaminoPoints, 404 for missing Camino.
- [ ] `GET /api/caminos/:caminoId/stages/:stageNumber` implemented with `ParseUUIDPipe` +
  `ParseIntPipe`, returns `StageDetail` with correct adjacent stage summaries, 404 for
  out-of-range stageNumber or missing Camino. No lazy creation (rows always exist from eager creation).
- [ ] `PATCH /api/caminos/:caminoId/stages/:stageNumber` implemented with `JwtAuthGuard` only (no
  `@Roles` decorator on the route). Service-layer check enforces `pilgrim` role; throws
  `ForbiddenException` for users without `pilgrim` or `owner` role.
- [ ] `UpdateStageDto` written with `@IsOptional()` on both fields, `@Min(0.1)`, `@Max(9999.9)`
  on `distance`, class-level "at least one field" guard.
- [ ] Shared stage reuse enforced: no duplicate Stage row created for the same `(startPointId, endPointId)` pair (upsert/findFirst pattern guards this).
- [ ] Batch Prisma query used in `findByCamino` — no N+1 queries.
- [ ] `updatedAt` updated on every successful PATCH.
- [ ] Full unit test coverage for `StagesService` methods and `StagesController` handlers. All
  Jest tests pass.
- [ ] Swagger decorators present on all new endpoints.
- [ ] No `process.env` direct access. No `console.log` in production code paths.

### Frontend

- [ ] `apps/frontend/app/api/stage-types.ts` created with shared TypeScript types.
- [ ] `use-stages.ts`, `use-stage.ts`, and `use-update-stage.ts` hooks created following the
  established pattern.
- [ ] `StageList` component created and replaces the waypoint `<ol>` on the Camino detail page.
- [ ] Camino detail page no longer renders the waypoints section. Empty state shown for <2 points.
- [ ] `/caminos/[camino_id]/stages/[stageNumber]/page.tsx` and `StageDetail` component created.
  Page is public (no auth guard). All content renders correctly: start/end points, distance,
  description, navigation buttons, back button, conditional Edit button.
- [ ] `/caminos/[camino_id]/stages/[stageNumber]/edit/page.tsx` and `StageEditForm` component
  created. Auth gate redirects unauthenticated users; renders `<AccessDenied />` for non-pilgrims.
- [ ] `StageEditForm` pre-populates correctly; start/end points are read-only; submit sends
  correct payload; cancel navigates without mutation; error state shown on failure.
- [ ] On successful PATCH, both `['stage', caminoId, stageNumber]` and `['stages', caminoId]`
  are invalidated so both the detail view and the Camino detail stage list reflect the update.
- [ ] All new user-visible strings use i18n keys (no hardcoded strings in JSX). All keys added to
  both `en.json` and `de.json` under the correct namespaces.
- [ ] `UpdateCaminoForm` detects departing stage pairs with data and shows the reorder-warning
  dialog before submitting. Confirmed-save proceeds; cancelled-save returns to form unchanged.
- [ ] Warning dialog uses `caminos_update.reorder_warning_*` i18n keys including `{count}` plural
  interpolation. Keys added to both `en.json` and `de.json`.
- [ ] All new hooks and components have Vitest + RTL unit tests. All tests pass.
- [ ] No `console.log` in production code paths. No `any` types. TypeScript strict mode
  throughout. No `test.skip()` anywhere.

### E2E

- [ ] `apps/e2e/tests/camino-update-delete.spec.ts` updated: the assertion `getByRole('heading', { name: 'Waypoints' })` (or equivalent) replaced with the new stages heading (`camino_detail.stages_heading` / "Stages" / "Etappen"). This test **will fail** the moment the feature is merged if not updated beforehand.
- [ ] `apps/e2e/tests/stages.spec.ts` created with the tests listed in the Test Plan section.
- [ ] All E2E tests pass in CI.
- [ ] Missing environment variables cause clear `expect(...)` assertion failures, not skips.

### General

- [ ] Feature branch `feature/stages` created from `main` before any work starts.
- [ ] PR opened targeting `main`; CI (lint, SAST, full test suite) passes.
- [ ] Human review approved before merge.
- [ ] After merge: `nestjs-backend-developer` updates Swagger/OpenAPI docs; `senior-frontend-dev`
  updates frontend documentation.
- [ ] Agent memory files under `.claude/agent-memory/` updated with new patterns or decisions
  discovered during implementation (e.g. eager stage creation pattern, shared entity reuse,
  pre-save confirmation dialog pattern for destructive ordering changes).

---

## Resolved Decisions (formerly Open Questions)

All questions below have been confirmed by the product owner on 2026-05-11.

1. **Stage creation — eager, not lazy.** ✅ Confirmed: stages are created eagerly in
   `CaminosService.create()` and `CaminosService.update()`. `GET` endpoints are read-only and
   never create rows.

2. **URL segment — `stageNumber`.** ✅ Confirmed: use 1-based integer in the URL (`/stages/1`).
   Human-readable and position-stable.

3. **`distance` precision — 1 decimal place, km.** ✅ Confirmed: use
   `@IsNumber({ maxDecimalPlaces: 1 })` on `UpdateStageDto.distance`. Unit is km (no conversion).

4. **Shared stage edit — silent updates acceptable.** ✅ Confirmed: no warning is shown when a
   pilgrim edits a stage shared with other Caminos. The change is reflected everywhere silently.

5. **Owner role — always implies pilgrim.** ✅ Confirmed: in Kinde, every user with `owner` is
   also assigned `pilgrim`. Checking `pilgrim` is sufficient for all write operations. The
   "owner cannot edit stages" restriction described in the initial draft was based on a
   misunderstanding. Owners and pilgrims have identical write capabilities. No separate test for
   "owner without pilgrim" is needed because that state cannot occur.

6. **Empty state for 0/1-point Caminos.** ✅ Confirmed: show `camino_detail.no_stages` message.
   Logged-in users (pilgrim or owner) additionally see the camino edit button below.

7. **`StageListItem.id` nullability.** ✅ Resolved by eager creation: `id` is always a UUID
   string in the list response because Stage rows are created at Camino-save time. The nullable
   `id: null` case no longer applies.

8. **E2E test update scope.** The existing test asserting a "Waypoints" heading in
   `camino-update-delete.spec.ts` must be updated by the developer to assert the "Stages" heading
   (`stage_detail.stages_heading` / "Etappen" → "Stages"). Scope is one test file.
