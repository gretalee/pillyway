---
id: PILLY-CAM-002
title: "Allow pilgrims and owners to view, update, and delete a camino"
type: Feature
priority: High
status: Finalized (v2) — ready for implementation
last_updated: 2026-05-04
depends_on: PILLY-CAM-001
---

# PILLY-CAM-002 — Allow pilgrims and owners to view, update, and delete a camino

**Type:** Feature
**Priority:** High — directly follows PILLY-CAM-001; caminos are permanently stuck without edit or delete capability. Blocks content quality and correctness for all users.
**Status:** Finalized (v2) — owner permissions added; ready for implementation

---

## User Persona(s)

**Guest**
An unauthenticated visitor (or any authenticated user without the `pilgrim` role who also did not create the camino). They can view the camino detail page to browse route information but have no write access. They see no edit controls, no three-dots menu, and no delete affordance.

**Pilgrim (Route Editor)**
An authenticated user with the `pilgrim` Kinde role. They contributed one or more caminos via PILLY-CAM-001. They need to correct mistakes, update waypoints, or remove caminos that are no longer valid. A pilgrim can edit and delete **any** camino, not only their own. They are not necessarily technical; the UI must remain intuitive and safe (destructive actions are confirmed).

**Owner**
Any authenticated user whose Kinde user ID matches the `createdBy` field of a camino — i.e. the user who originally created that camino. Owners have the same edit and delete capabilities as pilgrims, but only for **their own caminos**. An owner who does not hold the `pilgrim` role can still edit and delete the caminos they created. The owner check is: `camino.createdBy === authenticatedUser.id`.

---

## User Stories

### US-1 — View camino detail
As any visitor, I want to click on a camino in the list and see its full detail page (name, description, verified status, ordered waypoints), so that I can evaluate a route before planning a pilgrimage.

### US-2 — Inline edit name and description
As a pilgrim **or the camino's owner**, I want to click a pen icon next to the camino name or description and edit it inline, without navigating to a separate page, so that I can make small corrections quickly.

### US-3 — Update camino via form (waypoints and full data)
As a pilgrim **or the camino's owner**, I want to navigate to an update form that reuses the existing creation form, so that I can change the ordered list of waypoints (add, remove, reorder, link/unlink) or make broader edits.

### US-4 — Delete a camino
As a pilgrim **or the camino's owner**, I want to delete a camino via a confirmation dialog triggered from the camino list, so that I can remove routes that are incorrect or no longer relevant, with a safeguard against accidental deletion.

---

## Context & Background

PILLY-CAM-001 (completed) established the creation flow — `CaminosModule`, `POST /api/caminos`, `GET /api/caminos`, the `CreateCaminoForm` component, and the `/caminos` and `/caminos/new` pages. This ticket builds on that foundation.

The Prisma schema already defines the three relevant tables:
- `caminos` (id, name, description, verified, created_by, created_at, updated_at) — unique constraint on `name`
- `camino_points` (id, name, country, description, created_at) — unique constraint on `(name, country)`; global shared entities
- `camino_point_order` (camino_id, camino_point_id, position) — FK to `caminos` with `onDelete: Cascade`; FK to `camino_points` with `onDelete: Cascade`; composite PK on `(camino_id, camino_point_id)`; unique constraint on `(camino_id, position)`

**Delete semantics (critical):** Deleting a camino removes the `caminos` row and all its `camino_point_order` rows (via DB-level cascade — `onDelete: Cascade` on `camino_point_order.camino_id`). The `camino_points` rows themselves are NOT deleted — they are global shared entities and may be referenced by other caminos. No custom cascade logic is needed beyond what the existing schema already enforces.

**No schema migration is required for this ticket.** All necessary tables and relationships already exist.

**Patch semantics for waypoints:** A `PATCH /api/caminos/:id` that includes `caminoPoints` replaces the camino's entire ordered waypoint list atomically. The existing `camino_point_order` rows for that camino are deleted and re-created from the payload. CaminoPoint global records follow the same create-or-link logic as in `POST /api/caminos` (existing `caminoPointId` or new `{ name, country, description }`).

---

## Use Case Descriptions

### UC-1 — View camino detail

1. The user (any role) clicks a camino card on `/caminos`.
2. The browser navigates to `/caminos/[camino_id]`.
3. The page fetches `GET /api/caminos/:id` and displays: camino name, description (if present), verified badge (if `verified === true`), and ordered waypoints as a numbered list (name, country, description).
4. If the user has the `pilgrim` role **or is the camino's owner** (`camino.createdBy === user.id`), a pen icon is rendered next to the name and description fields, and the three-dots menu card actions are visible on `/caminos`.

### UC-2 — Inline edit name or description

1. A pilgrim is on `/caminos/[camino_id]`.
2. They click the pen icon next to the name (or description).
3. The static text is replaced by an `<input>` (name) or `<textarea>` (description) pre-populated with the current value.
4. The user edits the text and:
   - Presses **Enter** (name field) or clicks outside / **blur** (both fields) → saves.
   - Presses **Escape** → cancels; the field reverts to its pre-edit value.
5. On save, the UI immediately shows the new value (optimistic update). A `PATCH /api/caminos/:id` request is fired with `{ name }` or `{ description }` only.
6. If the request succeeds, the TanStack Query cache for `['camino', id]` is invalidated (or updated directly).
7. If the request fails, the field reverts to the pre-edit value and a toast or inline error message is shown.

### UC-3 — Update camino via form

1. A pilgrim accesses the update form either by:
   - Clicking "Change camino data" in the three-dots menu on the `/caminos` list card.
   - Clicking "Edit waypoints" or a similar CTA on `/caminos/[camino_id]` (visible only to pilgrims).
2. The browser navigates to `/caminos/[camino_id]/update`.
3. The page fetches `GET /api/caminos/:id` and pre-populates `CreateCaminoForm` with the existing name, description, and ordered waypoints.
4. The user makes changes (same form UX as creation: add/remove/reorder waypoints, inline duplicate suggestion, link/unlink).
5. On submit, the frontend sends `PATCH /api/caminos/:id` with the full updated payload (name, description, full caminoPoints list).
6. On success: invalidate `['caminos']` and `['camino', id]` TanStack Query caches, redirect to `/caminos/[camino_id]`.
7. On error: display inline error, retain form state.

### UC-4 — Delete camino

1. A pilgrim is on `/caminos`.
2. They open the three-dots menu on a camino card and click "Delete camino".
3. A confirmation dialog opens with the camino's name prominently displayed: "Are you sure you want to delete [camino name]? This action cannot be undone."
4. Two buttons: **"Cancel"** and **"Delete"** (destructive styling).
5. **Cancel**: dialog closes, nothing happens.
6. **Delete**: dialog shows a loading state on the button. The frontend sends `DELETE /api/caminos/:id`.
7. On success: close dialog, invalidate `['caminos']` TanStack Query cache (the deleted camino disappears from the list).
8. On error: keep dialog open, show error message below the buttons, re-enable the Delete button.

---

## Backend API Contract

### `GET /api/caminos/:id`

**Auth:** Public (no token required).

**Path param:** `id` — UUID string.

**Response `200`:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Camino Francés",
  "description": "The most popular route through France and Spain.",
  "verified": false,
  "createdBy": "kinde_user_id_string",
  "createdAt": "2026-04-10T10:00:00.000Z",
  "updatedAt": "2026-04-10T10:00:00.000Z",
  "caminoPoints": [
    { "id": "uuid", "name": "Saint-Jean-Pied-de-Port", "country": "France", "description": null, "position": 1 },
    { "id": "uuid", "name": "Pamplona", "country": "Spain", "description": "City of the Running of the Bulls.", "position": 2 }
  ]
}
```

`caminoPoints` is ordered ascending by `position`. Position is 1-based (consistent with PILLY-CAM-001's write path in `CaminosService.create`).

**Response `404`:** `{ "statusCode": 404, "message": "Camino not found." }`
**Response `400`:** `{ "statusCode": 400, "message": "Validation failed (uuid is expected)" }` — if `:id` is not a valid UUID (enforced by `ParseUUIDPipe`).

**NestJS implementation notes:**
- Decorate parameter with `@Param('id', ParseUUIDPipe)`.
- New service method: `CaminosService.findById(id: string): Promise<CaminoDetailFull>` — throws `NotFoundException('Camino not found.')` if no record exists.
- New Swagger decorators: `@ApiOkResponse`, `@ApiNotFoundResponse`.

---

### `PATCH /api/caminos/:id`

**Auth:** `JwtAuthGuard` required. The request is permitted when **either** of the following is true:
- The authenticated user has the `pilgrim` Kinde role.
- The authenticated user's ID matches `camino.createdBy` (the owner).

If neither condition is true, return `403`.

**Implementation note:** Because the owner check requires reading `camino.createdBy` from the database, `RolesGuard` alone cannot cover this endpoint. Use `JwtAuthGuard` to ensure the user is authenticated, then perform the role/ownership check at the **service layer** inside `CaminosService.update`:
1. Fetch the camino (throw `NotFoundException` if absent).
2. If `!user.roles.includes('pilgrim') && camino.createdBy !== user.id` → throw `ForbiddenException`.
3. Proceed with the update.

**Path param:** `id` — UUID string.

**Request body (all fields optional — at least one must be present):**
```json
{
  "name": "Camino Francés Updated",
  "description": "Updated description.",
  "caminoPoints": [
    { "caminoPointId": "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
    { "name": "Burgos", "country": "Spain", "description": null }
  ]
}
```

**Field rules:**
- `name`: optional; string; 1–120 chars; must not conflict with another camino's name (case-insensitive). Conflict with its own current name is not an error (no-op update is acceptable).
- `description`: optional; string or `null` (sending `null` clears the description); max 2000 chars.
- `caminoPoints`: optional; if present, replaces the entire waypoint list atomically. Array rules are identical to `POST`: 1–100 items, each item is XOR `{ caminoPointId }` or `{ name, country, description? }`. When `caminoPoints` is present in the payload, all existing `camino_point_order` rows for this camino are deleted and re-created.
- If the request body is empty (`{}`) or none of the three fields are present, return `400`.

**Response `200`:** Same shape as `GET /api/caminos/:id` response (`CaminoDetailFull`).

**Response `400`:** Validation failure (empty body, field constraints violated, invalid caminoPoint item shape).
**Response `401`:** Missing or invalid JWT.
**Response `403`:** Authenticated but neither has `pilgrim` role nor is the camino's owner.
**Response `404`:** Camino not found.
**Response `409`:** `name` conflicts with an existing camino (case-insensitive). Also `409` if a new-point item in `caminoPoints` conflicts with an existing `camino_points` row by `(name, country)` race condition (same logic as `POST`).

**NestJS implementation notes:**
- New DTO: `UpdateCaminoDto` with `@IsOptional()` on all three fields. Use `@AtLeastOneField()` custom validator (or a class-level `@ValidateIf` equivalent) to enforce that the body is not empty.
- `caminoPoints` field uses the same `CaminoPointItemDto` with the same XOR constraint.
- Service method: `CaminosService.update(id: string, dto: UpdateCaminoDto, userId: string, userRoles: string[]): Promise<CaminoDetailFull>`.
- Waypoint replacement logic runs inside a `prisma.$transaction`: delete all `camino_point_order` rows where `caminoId === id`, then re-insert using the same loop from `CaminosService.create`. This avoids position conflicts on the unique constraint `(camino_id, position)`.
- Updating `name` must set `updatedAt` (Prisma `update` does this automatically if `updatedAt` is a `@updatedAt` field — verify the schema; if not, pass `updatedAt: new Date()` explicitly).
- The controller passes `req.user.id` and `req.user.roles` to the service method. Do **not** use `@Roles('pilgrim')` on this route — the guard would reject owners without the pilgrim role.

---

### `DELETE /api/caminos/:id`

**Auth:** `JwtAuthGuard` required. The request is permitted when **either** of the following is true:
- The authenticated user has the `pilgrim` Kinde role.
- The authenticated user's ID matches `camino.createdBy` (the owner).

If neither condition is true, return `403`.

Same service-layer ownership check as `PATCH`: load the camino first, then assert `user.roles.includes('pilgrim') || camino.createdBy === user.id`. Do **not** use `@Roles('pilgrim')` on this route.

**Path param:** `id` — UUID string.

**Request body:** None.

**Response `204`:** No content. Camino and its `camino_point_order` rows deleted. `camino_points` rows are untouched.

**Response `401`:** Missing or invalid JWT.
**Response `403`:** Authenticated but neither has `pilgrim` role nor is the camino's owner.
**Response `404`:** Camino not found.

**NestJS implementation notes:**
- Decorate parameter with `@Param('id', ParseUUIDPipe)`.
- `@HttpCode(HttpStatus.NO_CONTENT)`.
- Service method: `CaminosService.delete(id: string, userId: string, userRoles: string[]): Promise<void>` — fetches camino first (throws `NotFoundException` if not found), checks `isPilgrim || isOwner` (throws `ForbiddenException` if neither), then calls `prisma.camino.delete({ where: { id } })`. The DB-level `onDelete: Cascade` on `camino_point_order.camino_id` removes the join rows automatically. No manual deletion of `camino_point_order` rows is necessary.
- Swagger: `@ApiNoContentResponse`, `@ApiNotFoundResponse`, `@ApiForbiddenResponse`.

---

## Frontend — Pages and Components

### 1. `/caminos` list — add three-dots menu per card

**File to modify:** `apps/frontend/app/caminos/components/CaminoList.tsx`

Add a three-dots menu (use shadcn/ui `DropdownMenu`) to each camino card. The menu is rendered when the user is a pilgrim **or** is the owner of that specific camino. The visibility condition per card is:
```typescript
const isPilgrim = useUserStore((s) => s.hasRole('pilgrim'));
const userId = useUserStore((s) => s.user?.id);
const canEdit = isPilgrim || userId === camino.createdBy;
```
`camino.createdBy` is returned by `GET /api/caminos` (already included in the list response). Guest and reviewer users who did not create the camino see the card with no action affordance.

Menu items:
- **"Change camino data"** — navigates to `/caminos/[camino.id]/update` via `router.push`.
- **"Delete camino"** — opens the `DeleteCaminoDialog` component (see below) for that camino.

The three-dots button must have an accessible `aria-label` using the i18n key `caminos.actions_menu_aria` (e.g., "Actions for [camino name]" — interpolate the name).

The `DropdownMenu` trigger must sit in the top-right of the card. It must not overlap the verified badge. Apply `shrink-0` and appropriate spacing.

---

### 2. `/caminos/[camino_id]` — detail page (new)

**New files:**
- `apps/frontend/app/caminos/[camino_id]/page.tsx` — server component
- `apps/frontend/app/caminos/[camino_id]/components/CaminoDetail.tsx` — client component

**`page.tsx` (server component):**
- Accepts `{ params: { camino_id: string } }` prop.
- Generates metadata: `title: t('camino_detail.meta_title')` (use `generateMetadata` async export).
- Renders `<CaminoDetail caminoId={camino_id} />`.
- Auth: page is public — no redirect, no role check at the page level.

**`CaminoDetail` (client component):**
- Calls `useCamino(caminoId)` (new hook, see below). Shows skeleton loader while loading, error state on failure.
- Renders:
  - Camino name — static text. If `canEdit` (pilgrim or owner), renders a pen icon button (`aria-label`: `caminos.edit_name_aria`) next to it. Clicking activates inline edit mode for the name field.
  - Camino description — static text or a "No description" placeholder. If `canEdit`, renders a pen icon button next to it. Clicking activates inline edit mode.
  - Verified badge: same visual as the list page badge (`caminos.verified` i18n key), shown only when `camino.verified === true`.
  - Waypoints section: a numbered list (`<ol>`) of caminoPoints, each showing name, country, and description (if present).
  - If `canEdit`: an "Edit waypoints" button or link that navigates to `/caminos/[camino_id]/update`.

The `canEdit` boolean is computed in `CaminoDetail`:
```typescript
const isPilgrim = useUserStore((s) => s.hasRole('pilgrim'));
const userId = useUserStore((s) => s.user?.id);
const canEdit = isPilgrim || userId === camino.createdBy;
```

**Inline edit UX — full specification:**

The component manages a local state shape:
```typescript
type EditingField = 'name' | 'description' | null;
const [editingField, setEditingField] = useState<EditingField>(null);
const [draftValue, setDraftValue] = useState<string>('');
```

When the user clicks a pen icon:
1. `setEditingField('name')` (or `'description'`).
2. `setDraftValue(camino.name)` (or `camino.description ?? ''`).
3. The static text for that field is replaced by:
   - Name: `<Input>` (shadcn/ui) with `autoFocus`, `value={draftValue}`, `onChange`, `onBlur`, `onKeyDown`.
   - Description: `<Textarea>` (shadcn/ui) with `autoFocus`, `value={draftValue}`, `onChange`, `onBlur`, `onKeyDown`.

**Save triggers (name field):** `Enter` key or `blur` event.
**Save triggers (description field):** `blur` event only (Enter in a textarea creates a newline).
**Cancel trigger (both fields):** `Escape` key — calls `setEditingField(null)`, does not save.

**Save sequence:**
1. Trim `draftValue`. If equal to the current value after trim, exit edit mode without firing a request (no-op).
2. Apply optimistic update: call TanStack Query's `queryClient.setQueryData(['camino', caminoId], ...)` with the draft value.
3. Call `useUpdateCamino`'s `mutate({ id: caminoId, [field]: trimmedDraft })`.
4. `setEditingField(null)` immediately (optimistic — field returns to static display showing the draft value).
5. On `onError` callback: revert the cache to the pre-edit value via `queryClient.setQueryData` and show a toast or inline error.

The pen icon must be keyboard-accessible: `<button type="button">` with `aria-label` and visible focus ring.

---

### 3. `/caminos/[camino_id]/update` — update page (new)

**New files:**
- `apps/frontend/app/caminos/[camino_id]/update/page.tsx` — server component

**`page.tsx` (server component):**
- Auth gate: redirect to `/api/auth/login` if unauthenticated (`getKindeServerSession()`). If authenticated, allow access — the ownership check cannot be done at the page level without a DB fetch; the service enforces 403 if the user is neither a pilgrim nor the owner. Do **not** render `<AccessDenied />` based on role alone, since owners without the `pilgrim` role must be able to access this page.
- Renders `<UpdateCaminoForm caminoId={camino_id} />` for all authenticated users (the form itself will receive a 403 from the API if the user is not authorised, and can show an error state).
- Generates metadata: `title: t('caminos_update.meta_title')`.

**`UpdateCaminoForm` (client component — new):**
- Lives at `apps/frontend/app/caminos/[camino_id]/components/UpdateCaminoForm.tsx`.
- Fetches `GET /api/caminos/:id` via `useCamino(caminoId)` to load current data.
- Pre-populates `CreateCaminoForm` with existing values. The `CreateCaminoForm` component must be made configurable for both create and update modes. Implementation options:
  - **Option A (preferred):** Accept optional `defaultValues` and `onSubmit` props on `CreateCaminoForm`, making it reusable as-is.
  - **Option B:** Extract the form logic into a shared hook and create separate thin wrappers.
  - The frontend developer chooses the cleanest approach; whichever is chosen must not break the existing `/caminos/new` flow.
- On submit, calls `useUpdateCamino` mutation with the full payload (name, description, caminoPoints).
- On success: `router.push('/caminos/[camino_id]')` and invalidate `['camino', caminoId]` and `['caminos']`.
- On error: display inline error, retain form state.

---

### 4. `DeleteCaminoDialog` component (new)

**File:** `apps/frontend/app/caminos/components/DeleteCaminoDialog.tsx`

Uses shadcn/ui `Dialog` (`AlertDialog` variant recommended for destructive confirmation patterns).

**Props:**
```typescript
interface DeleteCaminoDialogProps {
  camino: { id: string; name: string };
  open: boolean;
  onClose: () => void;
}
```

**Content:**
- Title: `caminos.delete_dialog_title` (e.g., "Delete camino")
- Body: `caminos.delete_dialog_body` with `name` interpolation (e.g., "Are you sure you want to delete \"{name}\"? This action cannot be undone.")
- Buttons: "Cancel" (`caminos.delete_dialog_cancel`) and "Delete" (`caminos.delete_dialog_confirm`, destructive variant).

**Behavior:**
- Cancel: calls `onClose()`. Dialog closes. No request fired.
- Confirm: disables both buttons, shows a `<Loader2>` spinner on the Delete button. Calls `useDeleteCamino` mutation.
  - On success: calls `onClose()`, invalidates `['caminos']` TanStack Query cache.
  - On error: re-enables the Delete button, shows error message below the buttons (`caminos.delete_dialog_error`).

The `CaminoList` component manages open state with `const [deletingCaminoId, setDeletingCaminoId] = useState<string | null>(null)`. The `DeleteCaminoDialog` is rendered once outside the list loop, receiving the selected camino's data.

---

### 5. New API hooks

All new hooks follow the existing pattern in `apps/frontend/app/api/`.

**`use-camino.ts`** (new):
```typescript
// Exports: fetchCamino(id), useCamino(id)
// Query key: ['camino', id]
// Endpoint: GET /api/caminos/:id
// Auth: none (public)
// Return type: CaminoDetailFull (see shape in API contract above)
// Error: throws if response is not ok; query disabled if id is empty string
```

**`use-update-camino.ts`** (new):
```typescript
// Exports: updateCamino(id, payload, token), useUpdateCamino()
// Mutation via useMutation
// Endpoint: PATCH /api/caminos/:id
// Auth: Bearer token from useKindeBrowserClient().accessTokenEncoded
// Payload type: UpdateCaminoPayload { name?: string; description?: string | null; caminoPoints?: CaminoPointPayload[] }
// Returns: CaminoDetailFull
// Error: throws with { status } attached (same pattern as use-create-camino.ts)
```

**`use-delete-camino.ts`** (new):
```typescript
// Exports: deleteCamino(id, token), useDeleteCamino()
// Mutation via useMutation
// Endpoint: DELETE /api/caminos/:id
// Auth: Bearer token from useKindeBrowserClient().accessTokenEncoded
// Returns: void (204 No Content)
// Error: throws with { status } attached
```

The `CaminoPointPayload` type is already exported from `use-create-camino.ts` — import from there; do not duplicate.

---

## i18n Keys

All keys must be added to both `apps/frontend/i18n/messages/de.json` and `apps/frontend/i18n/messages/en.json`.

### New keys under `caminos` namespace

| Key | EN value | DE value |
|---|---|---|
| `caminos.actions_menu_aria` | `"Actions for {name}"` | `"Aktionen für {name}"` |
| `caminos.menu_change_data` | `"Change camino data"` | `"Camino-Daten ändern"` |
| `caminos.menu_delete` | `"Delete camino"` | `"Camino löschen"` |
| `caminos.delete_dialog_title` | `"Delete camino"` | `"Camino löschen"` |
| `caminos.delete_dialog_body` | `"Are you sure you want to delete \"{name}\"? This action cannot be undone."` | `"Möchtest du \"{name}\" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."` |
| `caminos.delete_dialog_cancel` | `"Cancel"` | `"Abbrechen"` |
| `caminos.delete_dialog_confirm` | `"Delete"` | `"Löschen"` |
| `caminos.delete_dialog_error` | `"Failed to delete the camino. Please try again."` | `"Der Camino konnte nicht gelöscht werden. Bitte versuche es erneut."` |
| `caminos.edit_name_aria` | `"Edit camino name"` | `"Caminonamen bearbeiten"` |
| `caminos.edit_description_aria` | `"Edit camino description"` | `"Caminobeschreibung bearbeiten"` |
| `caminos.no_description` | `"No description provided."` | `"Keine Beschreibung vorhanden."` |

### New namespace `camino_detail`

| Key | EN value | DE value |
|---|---|---|
| `camino_detail.meta_title` | `"Camino Detail \| Pillyway"` | `"Camino-Detail \| Pillyway"` |
| `camino_detail.meta_description` | `"View the full details of this pilgrimage route."` | `"Sieh dir alle Details dieser Pilgerroute an."` |
| `camino_detail.waypoints_heading` | `"Waypoints"` | `"Wegpunkte"` |
| `camino_detail.edit_waypoints` | `"Edit waypoints"` | `"Wegpunkte bearbeiten"` |
| `camino_detail.error_loading` | `"Failed to load camino. Please try again."` | `"Camino konnte nicht geladen werden. Bitte versuche es erneut."` |
| `camino_detail.inline_save_error` | `"Failed to save changes. Reverted to previous value."` | `"Änderungen konnten nicht gespeichert werden. Vorheriger Wert wurde wiederhergestellt."` |

### New namespace `caminos_update`

| Key | EN value | DE value |
|---|---|---|
| `caminos_update.title` | `"Update Camino"` | `"Camino bearbeiten"` |
| `caminos_update.meta_title` | `"Update Camino \| Pillyway"` | `"Camino bearbeiten \| Pillyway"` |
| `caminos_update.meta_description` | `"Edit this pilgrimage route."` | `"Diese Pilgerroute bearbeiten."` |
| `caminos_update.submit` | `"Save changes"` | `"Änderungen speichern"` |
| `caminos_update.submitting` | `"Saving…"` | `"Wird gespeichert…"` |
| `caminos_update.error_generic` | `"Failed to update camino. Please try again."` | `"Camino konnte nicht aktualisiert werden. Bitte versuche es erneut."` |
| `caminos_update.error_conflict` | `"A camino with this name already exists. Please choose a different name."` | `"Ein Camino mit diesem Namen existiert bereits. Bitte wähle einen anderen Namen."` |
| `caminos_update.error_loading` | `"Failed to load camino data for editing."` | `"Camino-Daten konnten nicht zum Bearbeiten geladen werden."` |

---

## Edge Cases & Error Handling

| Scenario | Expected behavior |
|---|---|
| `GET /api/caminos/:id` with non-existent ID | Backend: `404`. Frontend: renders error state with `camino_detail.error_loading` message. |
| `GET /api/caminos/:id` with non-UUID `:id` | Backend: `400` (ParseUUIDPipe). Frontend: same error state. |
| Pilgrim inlines-edits name to an empty string | Do not fire the PATCH request. Either disable save on empty (client-side guard) or show inline validation. Re-enable Escape to cancel. |
| Pilgrim inlines-edits name to a conflicting value | Backend returns `409`. Frontend reverts the optimistic update and shows `camino_detail.inline_save_error`. |
| Pilgrim edits name to the same value as before | Frontend detects no change after trim, exits edit mode without firing a request. |
| `PATCH` with no changed fields (all same values) | Backend accepts and returns 200. Frontend may skip the request if all values are identical (optional optimization — not required). |
| `PATCH /api/caminos/:id` with empty body `{}` | Backend returns `400`. |
| `PATCH` caminoPoints array is empty `[]` | Backend returns `400` (same `@ArrayMinSize(1)` constraint as POST). |
| `DELETE` camino that has `camino_point_order` rows | Backend deletes the camino; DB cascade removes the join rows. CaminoPoint global records remain. |
| `DELETE` non-existent camino | Backend: `404`. Frontend: shows error in dialog, re-enables the Delete button. |
| User navigates to `/caminos/[camino_id]/update` while unauthenticated | Server component redirects to `/api/auth/login`. |
| Authenticated user without `pilgrim` role visits `/caminos/[camino_id]/update` | Server component renders `<AccessDenied />`. |
| Network failure during delete confirm | Dialog shows `caminos.delete_dialog_error`, re-enables the Delete button, keeps dialog open. |
| Network failure during inline save | Optimistic update is reverted, `camino_detail.inline_save_error` is shown. |
| `UpdateCaminoForm` fails to load camino data (for pre-population) | Render error state with `caminos_update.error_loading` message and a back-link to `/caminos`. |
| Two pilgrims edit the same camino name simultaneously | Last write wins. The second PATCH may get a 409 (name conflict) if the name chosen by the second pilgrim matches the first's new name. Return 409; no special merge logic. |
| `camino_point_order` unique constraint `(camino_id, position)` on PATCH | Prevented by the delete-then-reinsert transaction pattern. Do not attempt in-place position updates. |

---

## Out of Scope

- Camino verification flow (`verified = true`) — admin-only, future ticket.
- Editing global `camino_points` records from within the camino form — the form can link existing points or create new ones; it cannot patch a shared `camino_point`'s name/description.
- Deleting `camino_points` rows — they are global shared entities; no deletion UI is planned.
- Soft delete / archive — `DELETE` is permanent in V1.
- Undo / undo history.
- Inline editing of individual waypoints from the detail page — waypoints are edited via the update form at `/caminos/[camino_id]/update`.
- Restricting which caminos appear in search results by author.
- Drag-and-drop reordering of waypoints (up/down buttons remain sufficient — established in PILLY-CAM-001).
- Showing more than one suggestion match in the inline duplicate suggestion UI (established in PILLY-CAM-001).
- Role management UI (assigning/revoking `pilgrim` role) — admin task.
- Reviews or accommodations on the detail page — future tickets.

---

## Dependencies

- PILLY-CAM-001 must be merged before implementation begins.
- `CaminosModule`, `CaminosController`, `CaminosService`, `PrismaService`, `JwtAuthGuard`, `RolesGuard`, and `@Roles('pilgrim')` decorator are all already in place.
- `CreateCaminoForm`, `CaminoPointRow`, `SuggestionCard`, `AccessDenied`, `useCaminos`, `useCreateCamino`, `useCountries`, `useCaminoPointsSearch` already exist.
- shadcn/ui `DropdownMenu` and `AlertDialog` (or `Dialog`) components must be added if not already present: `npx shadcn@latest add dropdown-menu alert-dialog` (run from `apps/frontend/`). Check before adding.
- No Prisma migration needed — schema already supports all operations.

---

## Test Plan

### Backend — unit tests (Jest, mock `PrismaService`)

All tests live in `apps/backend/src/caminos/` alongside the service.

**`CaminosService.findById`:**
- Returns `CaminoDetailFull` with ordered caminoPoints when camino exists.
- Throws `NotFoundException` when camino does not exist.

**`CaminosService.update`:**
- Returns updated `CaminoDetailFull` when name-only update succeeds (as pilgrim).
- Returns updated `CaminoDetailFull` when description-only update succeeds (as pilgrim).
- Returns updated `CaminoDetailFull` when full caminoPoints replacement succeeds (delete + reinsert) (as pilgrim).
- Returns updated `CaminoDetailFull` when owner (non-pilgrim) updates their own camino.
- Throws `NotFoundException` when camino does not exist.
- Throws `ForbiddenException` when authenticated user is neither pilgrim nor the camino's owner.
- Throws `ConflictException` when new name conflicts with another camino (case-insensitive).
- Throws `BadRequestException` when a caminoPoint item is referenced by ID but the ID does not exist in the DB.
- Propagates `InternalServerErrorException` on unexpected Prisma errors.

**`CaminosService.delete`:**
- Calls `prisma.camino.delete` and returns `void` when user is a pilgrim.
- Calls `prisma.camino.delete` and returns `void` when user is the camino's owner (non-pilgrim).
- Throws `ForbiddenException` when authenticated user is neither pilgrim nor the camino's owner.
- Throws `NotFoundException` when camino does not exist.

**Controller tests (`CaminosController`):**
- `GET /caminos/:id` — delegates to `findById`, returns 200 with correct shape.
- `PATCH /caminos/:id` — delegates to `update`, returns 200 for pilgrim; returns 200 for owner; returns 403 when service throws `ForbiddenException`.
- `DELETE /caminos/:id` — delegates to `delete`, returns 204 for pilgrim; returns 204 for owner; returns 403 when service throws `ForbiddenException`.
- DTO validation: `UpdateCaminoDto` with empty body rejects with 400; with only `name` passes; with invalid `caminoPointId` rejects.

### Frontend — unit tests (Vitest + React Testing Library)

**`useCamino` hook (`use-camino.test.ts`):**
- Returns `CaminoDetailFull` data on successful fetch.
- Returns error state on 404 or network failure.

**`useUpdateCamino` hook (`use-update-camino.test.ts`):**
- Sends `PATCH` with correct headers and body.
- Attaches `{ status }` to thrown error on non-ok response.

**`useDeleteCamino` hook (`use-delete-camino.test.ts`):**
- Sends `DELETE` with correct headers.
- Attaches `{ status }` to thrown error on non-ok response.

**`CaminoDetail` component (`CaminoDetail.test.tsx`):**
- Renders name, description, verified badge, and waypoints list.
- Shows pen icon when user has `pilgrim` role.
- Shows pen icon when user is the camino's owner (non-pilgrim).
- Does not show pen icon for guest or non-owner reviewer.
- Clicking pen icon replaces static text with an input.
- Pressing Escape cancels and restores original value.
- Pressing Enter (name) or blur fires update mutation.
- On mutation error, reverts to previous value.

**`DeleteCaminoDialog` component (`DeleteCaminoDialog.test.tsx`):**
- Renders with camino name in body text.
- Cancel button calls `onClose`, fires no request.
- Confirm button fires delete mutation.
- Error state displays error message and re-enables button.

**`CaminoList` component (`CaminoList.test.tsx` — update existing tests):**
- Three-dots menu is absent for guests and non-owner, non-pilgrim users.
- Three-dots menu is visible for pilgrim users (on all camino cards).
- Three-dots menu is visible for the camino's owner (only on their own camino cards).
- "Change camino data" navigates to `/caminos/[id]/update`.
- "Delete camino" opens `DeleteCaminoDialog`.

### E2E — Playwright

All E2E tests live in `apps/e2e/tests/`. Tests assume a seeded test database with at least one camino and a test account with the `pilgrim` role.

**Happy paths:**

| Test | Steps |
|---|---|
| View camino detail | Navigate to `/caminos`, click a camino card, assert detail page shows name and at least one waypoint. |
| Inline edit name | Log in as pilgrim, navigate to detail page, click pen icon next to name, clear and type new name, press Enter, assert static display shows new name. |
| Inline edit cancel | Log in as pilgrim, click pen icon, type new name, press Escape, assert original name is still displayed. |
| Navigate to update form | Log in as pilgrim, open three-dots menu on a camino card, click "Change camino data", assert URL is `/caminos/[id]/update` and form is pre-populated. |
| Update camino via form | Submit update form with changed name, assert redirect to detail page and new name displayed. |
| Delete camino | Log in as pilgrim, open three-dots menu, click "Delete camino", assert dialog opens with camino name, click "Delete", assert dialog closes and camino is gone from the list. |

**Owner-specific paths:**

| Test | Steps |
|---|---|
| Owner edits own camino | Log in as non-pilgrim owner, assert pen icons and three-dots menu visible on their own camino. Inline-edit name and verify change. |
| Owner deletes own camino | Log in as non-pilgrim owner, open three-dots menu on their camino, click Delete, confirm, assert camino gone. |
| Owner sees no menu on others' caminos | Log in as non-pilgrim owner, assert no three-dots menu on camino cards they did not create. |

**Error/edge-case paths:**

| Test | Steps |
|---|---|
| Delete cancel | Open dialog, click Cancel, assert camino still appears in list. |
| Guest sees no menu | Visit `/caminos` without auth, assert no three-dots button is rendered on any card. |
| Unauthenticated update redirect | Visit `/caminos/[id]/update` without auth, assert redirect to Kinde login. |
| Non-owner non-pilgrim cannot PATCH | Directly call `PATCH /api/caminos/:id` as a reviewer who does not own the camino — assert `403`. |

---

## Definition of Done

### Backend
- [ ] `GET /api/caminos/:id` implemented with `ParseUUIDPipe`, `NotFoundException` on missing record, and the `CaminoDetailFull` response shape (including ordered `caminoPoints`).
- [ ] `PATCH /api/caminos/:id` implemented with `JwtAuthGuard` only (no `@Roles`). Service checks `isPilgrim || isOwner`; throws `ForbiddenException` if neither. Handles name-only, description-only, caminoPoints-only, and combined updates. Empty body returns 400. Name conflict returns 409. Missing ID returns 404.
- [ ] Waypoint replacement in `PATCH` uses a single Prisma transaction: delete existing `camino_point_order` rows, re-insert from payload using the same create logic as `CaminosService.create`.
- [ ] `DELETE /api/caminos/:id` implemented with `JwtAuthGuard` only (no `@Roles`), `@HttpCode(204)`. Service checks `isPilgrim || isOwner`; throws `ForbiddenException` if neither. Returns 404 if not found. Does not delete `camino_points` rows.
- [ ] `UpdateCaminoDto` written with `@IsOptional()` on all fields and a class-level "at least one field present" guard.
- [ ] `CaminosController` has new route handlers for `GET :id`, `PATCH :id`, `DELETE :id` with correct Swagger decorators.
- [ ] Unit tests for all three new service methods (`findById`, `update`, `delete`) covering pilgrim access, owner access, and non-owner non-pilgrim rejection. Jest coverage passes.
- [ ] No `process.env` direct access — all config via `ConfigService`.
- [ ] No `console.log` in production code paths.

### Frontend
- [ ] `use-camino.ts` hook created; fetches `GET /api/caminos/:id`; query key `['camino', id]`.
- [ ] `use-update-camino.ts` hook created; sends authenticated `PATCH`; returns `CaminoDetailFull`.
- [ ] `use-delete-camino.ts` hook created; sends authenticated `DELETE`; returns `void`.
- [ ] `/caminos/[camino_id]/page.tsx` created as a public server component that renders `CaminoDetail`.
- [ ] `CaminoDetail` renders name, description, verified badge, and ordered waypoints.
- [ ] Pen icon and inline edit UI (input/textarea, save on Enter/blur, cancel on Escape) implemented and functional.
- [ ] Optimistic update applied on inline save; reverted on error with visible error message.
- [ ] `/caminos/[camino_id]/update/page.tsx` created with auth gate (redirect if unauthenticated, `<AccessDenied />` if not pilgrim).
- [ ] `UpdateCaminoForm` pre-populates `CreateCaminoForm` with existing camino data; submits via `useUpdateCamino`; redirects on success.
- [ ] `CaminoList` updated with three-dots `DropdownMenu` (pilgrim or owner per card) containing "Change camino data" and "Delete camino" items. Visibility condition: `isPilgrim || userId === camino.createdBy`.
- [ ] `DeleteCaminoDialog` implemented using shadcn/ui `AlertDialog`; shows camino name; loading state on Delete; error state on failure.
- [ ] All new user-facing strings use i18n keys; keys added to both `de.json` and `en.json`.
- [ ] Unit tests written for all new hooks and components (Vitest + RTL).
- [ ] No `console.log` in production code paths; no `any` types; strict TypeScript throughout.

### E2E
- [ ] Playwright tests cover: view detail, inline edit name (happy path + cancel), navigate to update form, full update submission, delete with confirmation (happy path + cancel), guest sees no menu, unauthenticated update redirect, owner can edit/delete camino, owner sees no menu on others' caminos, non-owner non-pilgrim gets 403 from API.
- [ ] All E2E tests pass in CI.

### General
- [ ] Feature branch `feature/camino-update-delete` created from `main` before any work starts.
- [ ] PR opened targeting `main`; CI (lint, SAST, tests) passes.
- [ ] Human review approved before merge.
- [ ] After merge: `nestjs-backend-developer` updates Swagger/OpenAPI docs; `senior-frontend-dev` updates frontend documentation.
- [ ] Agent memory files updated with any new patterns or decisions discovered during implementation.
