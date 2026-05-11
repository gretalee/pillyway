---
name: "Stages feature decisions"
description: "Key product decisions for PILLY-STG-001: Stage entity, lazy creation, shared-stage reuse, stageNumber URL design, edit permissions, new API endpoints, and test scope"
type: project
---

Ticket PILLY-STG-001 defines the Stage list, Stage detail view, and Stage edit form. See `.claude/tickets/feature-stages.md` for the full specification.

**Why:** Stages are the primary navigational unit of a Camino. Replacing the raw waypoint list with a stage-by-stage view exposes the meaningful leg structure that users need for route planning.

**How to apply:** Reference these decisions in any ticket that touches the stage domain, the Camino detail page, or pilgrim write access to stage data.

## Domain naming

- **Stage** (German: *Etappe*) — the leg between two consecutive CaminoPoints on a Camino.
- `startPoint` / `endPoint` — the CaminoPoint at position K and K+1.
- `stageNumber` — 1-based integer derived from CaminoPoint ordering; used in URLs.
- Stage identity: uniquely identified by `(startPointId, endPointId)`. Shared across Caminos.

## New Prisma model

`Stage` table: `id`, `startPointId`, `endPointId`, `distance` (Float?), `description` (String?), `createdAt`, `updatedAt`. Unique constraint on `(startPointId, endPointId)`. Back-relations added to `CaminoPoint`. Migration: `add-stages`.

## API endpoints

- `GET /api/caminos/:caminoId/stages` — public; returns `StageListItem[]` ordered by stage number; empty array for <2 CaminoPoints; 404 for missing Camino.
- `GET /api/caminos/:caminoId/stages/:stageNumber` — public; triggers lazy Stage creation (upsert) if no DB row exists; returns `StageDetail` with adjacent stage summaries; 404 for out-of-range stageNumber.
- `PATCH /api/caminos/:caminoId/stages/:stageNumber` — protected (`JwtAuthGuard` only, no `@Roles`); service-layer check enforces `pilgrim` role ONLY (owners cannot edit stages); returns updated `StageDetail`.

## URL design

Uses `stageNumber` (1-based integer) in the URL path, not the Stage UUID. Human-readable and position-stable.

## Lazy creation semantics

Stage rows are created automatically on first `GET .../stages/:n` (not on Camino create/update). An open question asks the architect to confirm lazy vs. eager creation.

## Permission model (stage editing)

Stage editing is restricted to `pilgrim` role ONLY. Owners can edit Caminos (PILLY-CAM-002) but cannot edit stages. This asymmetry is flagged as an open question for stakeholder confirmation.

## Shared stage reuse

A Stage record is shared whenever two Caminos traverse the same (startPointId, endPointId) pair. Editing a shared stage updates it globally for all Caminos that include that pair.

## Frontend routes

- `/caminos/[camino_id]` — existing; waypoints `<ol>` replaced by `StageList` component.
- `/caminos/[camino_id]/stages/[stageNumber]` — new public detail page (`StageDetail` client component).
- `/caminos/[camino_id]/stages/[stageNumber]/edit` — new protected edit page (`StageEditForm` client component; pilgrim only).

## New i18n namespaces

- Keys under `camino_detail` namespace: `stages_heading`, `no_stages`, `error_loading_stages`.
- New namespace `stage_detail` — all stage detail page strings.
- New namespace `stage_edit` — all edit form strings.

## Open questions (unresolved at ticket write time)

1. Lazy vs. eager Stage creation — architect to confirm.
2. stageNumber vs. UUID in URL — architect to confirm (stageNumber proposed).
3. Float precision on `distance` — additional constraint or arbitrary float.
4. Shared stage edit UX — warn user when editing a shared stage?
5. Owner role edit restriction — stakeholder to confirm asymmetry is intentional.
6. PILLY-CAM-002 E2E test referencing "Waypoints" heading — must be updated to "Stages".
7. `StageListItem.id` nullability at list level — architect to confirm.
8. Empty camino (1 point) UX — prompt to add more points or plain empty message.

## Testing scope

- Backend: Jest unit tests for `StagesService` (findByCamino, findOne, update) and `StagesController`.
- Frontend: Vitest + RTL for `useStages`, `useStage`, `useUpdateStage`, `StageList`, `StageDetail`, `StageEditForm`.
- E2E: new `stages.spec.ts` — public view, stage navigation, pilgrim edit happy path and cancel, unauthenticated redirect.
