---
name: "Camino creation feature decisions"
description: "Key product decisions for PILLY-CAM-001: camino + caminoPoint creation form, /caminos list, pilgrim role, DB schema, and duplicate-point UX — context for future tickets in this domain"
type: project
---

Ticket PILLY-CAM-001 defines the first camino creation feature. See `.claude/tickets/feature-camino-creation.md` for the full specification.

**Why:** Foundational data-entry feature — without it, no camino data exists in the system at all.

**How to apply:** Reference these decisions in any ticket that touches the camino domain, caminoPoint, caminoStage, accommodation, or the pilgrim role.

## Domain naming

The product uses Spanish-inspired terminology throughout:
- **camino** = a named pilgrimage route (not "Route")
- **caminoPoint** = a village/city waypoint on the route (not "Stage")
- **caminoStage** = the leg between two caminoPoints (out of scope in this phase)
- **accommodation** / **sight** = sub-entities of a caminoPoint

## RoutesModule

The existing `RoutesModule` is an empty placeholder stub. **It must be deleted.** The backend developer removes it and all references to it before creating `CaminosModule`. This is a resolved, explicit decision — do not reopen it.

## Role: pilgrim

- New Kinde role key: `pilgrim`
- This replaces / is parallel to the old `Route Editor` role concept in CLAUDE.md
- Must be created in the Kinde dashboard and assigned manually (admin task, out of scope for the feature)
- Backend uses `@Roles('pilgrim')` decorator + existing `RolesGuard` (already wired)
- Frontend uses `useUserStore().hasRole('pilgrim')` check

## Auth pattern

- `/caminos/new` is a protected frontend route — redirect to Kinde login if unauthenticated
- After auth, gate rendering of the form on `hasRole('pilgrim')`; show a "not authorized" message otherwise
- Backend POST `/api/caminos` requires `JwtAuthGuard` + `RolesGuard` with `@Roles('pilgrim')`

## Database tables (Supabase / PostgreSQL)

Scope for this ticket:
- `caminos` (id, name, description, verified, created_by, created_at, updated_at)
- `camino_points` (id, name, country, description, created_at) — **global shared entities**, unique constraint on (name, country)
- `camino_point_order` (camino_id, camino_point_id, position) — join table for many-to-many with ordering

**CaminoPoint creation policy (RESOLVED — Option B chosen):** The frontend surfaces potential duplicates to the user via an inline suggestion UI before submission. The backend receives either an existing `caminoPointId` or a new `{ name, country, description }` per caminoPoint row — never both on the same row. The backend does not silently upsert; it trusts the frontend's choice. A DB-level unique constraint on `(name, country)` guards against race conditions (returns 409).

Out of scope (future tickets):
- `camino_stages`, `accommodations`, `sights`, `verifications`, `reviews`

## API

- `GET /api/caminos` — public, returns list of caminos (id, name, description, verified)
- `POST /api/caminos` — protected (pilgrim role); each caminoPoint item is either `{ caminoPointId }` (existing) or `{ name, country, description }` (new); atomic transaction; 409 on race-condition duplicate
- `GET /api/camino-points/search?name=<query>&country=<country>` — public; case-insensitive ILIKE on name, exact country match; max 5 results; returns `{ id, name, country, description }[]`
- `GET /api/countries` — public, returns allowed country values as string array; frontend dropdown fetches via TanStack Query (not a hardcoded constant)
- Backend module: `CaminosModule` (new, replaces deleted `RoutesModule`)

## Inline duplicate suggestion UX

Trigger: debounced call to `GET /api/camino-points/search` once both name and country fields in a caminoPoint row have values. Fires on blur from name field or when both fields are populated.

Behavior:
- Match found: show inline suggestion card with matched point's name + description. Two buttons: "Yes, use this existing point" / "No, create a new one".
- "Yes": row enters linked mode — `caminoPointId` set, name/description become read-only. Changing name or country later breaks the link automatically.
- "No": suggestion dismissed, row stays in new-point mode.
- No match: no UI shown, normal flow.
- Search failure: silently suppressed — does not block the form.

i18n keys: `caminos_new.suggestion.prompt`, `caminos_new.suggestion.yes`, `caminos_new.suggestion.no`

## Frontend routes

- `/caminos` — public list page (stub already exists)
- `/caminos/new` — protected creation form (stub already exists)

## i18n

- Translation keys go under `caminos` and `caminos_new` namespaces in `messages/de.json` and `messages/en.json`
- Both files already exist and already have partial keys for these namespaces

## Testing

- Frontend: Vitest + React Testing Library (already in package.json)
- Backend: Jest (NestJS default)
- E2E: explicitly out of scope for this ticket

## All resolved decisions

1. **Role key:** `pilgrim` confirmed. `@Roles('pilgrim')` is correct.
2. **CaminoPoints scope:** Global shared entities. Many-to-many via `camino_point_order`.
3. **`verified` flag:** System/admin only, always `false` on creation.
4. **Country dropdown:** Fetched from `GET /api/countries` via TanStack Query. Not hardcoded.
5. **Form library:** react-hook-form with `useFieldArray`. Must be installed.
6. **RoutesModule fate:** Delete it. First step before backend implementation.
7. **Duplicate caminoPoint UX:** Option B — inline suggestion UI with explicit user choice. New search endpoint `GET /api/camino-points/search`. POST body supports both `caminoPointId` and new-point fields via conditional DTO validation.
