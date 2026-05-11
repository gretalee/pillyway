---
name: "Camino update and delete feature decisions"
description: "Key product decisions for PILLY-CAM-002: camino detail page, inline edit, update form, delete flow, new API endpoints, and test plan — context for any ticket touching camino write flows"
type: project
---

Ticket PILLY-CAM-002 defines the view, update, and delete flows for caminos. See `.claude/tickets/feature-camino-update-delete.md` for the full specification.

**Why:** PILLY-CAM-001 created the write path for new caminos but left no way to correct or remove them. This ticket completes the CRUD surface for the pilgrim role.

**How to apply:** Reference these decisions in any ticket that touches camino editing, the detail page, the `/caminos` list card actions, or future role-based write access.

## New API endpoints

- `GET /api/caminos/:id` — public; returns `CaminoDetailFull` with ordered caminoPoints (position is 1-based); 404 on missing; 400 via ParseUUIDPipe on non-UUID.
- `PATCH /api/caminos/:id` — protected (pilgrim **or camino owner**); partial update; all fields optional but at least one required; if caminoPoints is present, replaces entire waypoint list atomically (name check + delete-then-reinsert + scalar update in one transaction); 409 on name conflict; 404 on missing; 403 if neither pilgrim nor owner.
- `DELETE /api/caminos/:id` — protected (pilgrim **or camino owner**); 204 No Content; DB cascade on `camino_point_order` handles join rows; `camino_points` global records are NOT deleted; 403 if neither pilgrim nor owner.

## Delete semantics (resolved)

Deleting a camino removes only the `caminos` row. `camino_point_order` rows cascade via DB (`onDelete: Cascade` already in schema). `camino_points` rows are global shared entities — never deleted by this flow. No schema migration is needed.

## Waypoint replacement on PATCH (resolved)

When `caminoPoints` is included in a PATCH payload, the backend deletes all existing `camino_point_order` rows for that camino and re-inserts from the payload inside a single Prisma transaction. This avoids unique constraint conflicts on `(camino_id, position)`. Do not attempt in-place position updates.

## Edit authorization model (resolved for V1)

PATCH and DELETE are permitted for **pilgrims** (any camino) **or the camino's owner** (the authenticated user whose Kinde `sub` matches `camino.createdBy`). The check is done at the service layer — there is no `@Roles('pilgrim')` guard on these routes. A non-pilgrim who owns a camino can edit and delete only their own caminos.

## Inline edit UX (resolved)

Inline edit is limited to `name` and `description` fields on the detail page. Waypoints are only editable via the update form at `/caminos/[camino_id]/update`. The inline flow uses optimistic updates; reverts on error. Save on Enter (name) or blur (both). Cancel on Escape.

## `CreateCaminoForm` reuse for update

The existing `CreateCaminoForm` is reused for the update flow. It must be made configurable via optional `defaultValues` and `onSubmit` props (Option A in the ticket) — or extracted to a shared hook (Option B). The frontend developer chooses the cleanest approach. The existing `/caminos/new` flow must not break.

## New frontend routes

- `/caminos/[camino_id]` — public detail page (server component + `CaminoDetail` client component)
- `/caminos/[camino_id]/update` — protected update form (same auth gate pattern as `/caminos/new`)

## New i18n namespaces

- `camino_detail` — detail page strings
- `caminos_update` — update form strings
- Added keys under existing `caminos` namespace for menu and dialog strings

## shadcn/ui components to add (if not present)

- `dropdown-menu` — for the three-dots card menu
- `alert-dialog` — for the delete confirmation dialog

Run: `npx shadcn@latest add dropdown-menu alert-dialog` from `apps/frontend/`.

## Testing scope (resolved)

This ticket includes E2E tests (Playwright) — this is a change from PILLY-CAM-001 which explicitly deferred E2E. Backend unit tests mock PrismaService. Frontend unit tests use Vitest + RTL.
