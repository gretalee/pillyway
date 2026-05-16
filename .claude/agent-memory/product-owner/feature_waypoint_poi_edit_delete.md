---
name: "Waypoint POI edit/delete feature decisions"
description: "Key product decisions for PILLY-POI-001: Accommodation type/contact/price/address fields, Sight address+location fields, edit+delete flows for both entities, domain separation architecture decision, backlink fix, API contract, permission model, and test scope"
type: project
---

Ticket PILLY-POI-001 extends Accommodation and Sight with new fields and adds edit + delete flows for both. See `.claude/tickets/PILLY-POI-001-waypoint-poi-extend-edit-delete.md` for the full specification.

**Why:** POI data (accommodations and sights) currently lacks the contact and categorisation fields needed for practical route planning. Without edit/delete, erroneous entries can only be fixed via direct DB access.

**How to apply:** Reference these decisions in any ticket that touches the Accommodation or Sight domain, the waypoint detail page, or pilgrim write access to POI data.

## Architecture decision: separate Accommodation and Sight as distinct domains

Recommendation accepted: move Accommodation and Sight out of the shared `waypoints` NestJS module into their own dedicated modules (`accommodations/` and `sights/`). The `waypoints` module retains the `GET /waypoints/:slug` endpoint which aggregates both. Rationale: Accommodations will gain verification, user reviews, and richer contact/pricing attributes that Sights will not have. The attribute sets diverge significantly now and will diverge further in future phases. Treating them as a shared generic type creates unnecessary coupling.

## New Prisma fields

### Accommodation
- `type` — required enum `AccommodationType`: hostel | monastery | b_and_b | hotel | apartment | private_room. Stored as Postgres enum via Prisma native enum. Required on create; migration must set a default for existing rows.
- `email` — optional String; validated with `@IsEmail()` at DTO level
- `website` — optional String; validated with `@IsUrl()` at DTO level
- `addressStreet` — optional String (street + number combined)
- `addressZip` — optional String
- `addressCity` — optional String
- `addressCountry` — optional String
- `priceRange` — optional enum `PriceRange`: budget | moderate | comfortable | luxury

### Sight
- `address` — optional String (free-text, single field)
- `latitude` — optional Float
- `longitude` — optional Float

Migration name: `add-accommodation-type-contact-price-address-and-sight-address-location`

## API endpoints (new/modified)

- `POST /api/waypoints/:slug/accommodations` — extended to accept all new accommodation fields; `type` is required
- `POST /api/waypoints/:slug/sights` — extended to accept `address`, `latitude`, `longitude`
- `GET /api/accommodations/:id` — new public endpoint; returns full accommodation detail
- `PATCH /api/accommodations/:id` — protected (pilgrim role); partial update, at least one field required; 404/403
- `DELETE /api/accommodations/:id` — protected (pilgrim role); 204 No Content; 404/403
- `GET /api/sights/:id` — new public endpoint; returns full sight detail
- `PATCH /api/sights/:id` — protected (pilgrim role); partial update; 404/403
- `DELETE /api/sights/:id` — protected (pilgrim role); 204 No Content; 404/403

## Permission model

Pilgrim role only — same as camino editing. `@Roles('pilgrim')` guard on all four write endpoints. No per-entity ownership check.

## Frontend API layer (new file pattern)

All new API files follow the `fetch-[domain].ts` / `use-[domain].ts` split under `apps/frontend/app/api/accommodations/` and `apps/frontend/app/api/sights/`.

## Frontend changes

- `AccommodationCard` and `SightCard` on `/waypoints/[slug]` gain edit (pencil) and delete (trash) icon buttons, visible only when `hasRole('pilgrim')`.
- Edit opens an inline sheet/dialog with a pre-filled form (react-hook-form).
- Delete shows a shadcn `AlertDialog` confirmation before calling the DELETE endpoint.
- `AddAccommodationForm` and `AddSightForm` extended with new fields.
- Verification-status badge already rendered on `AccommodationCard` — no change needed.
- Verification-links section rendered above the accommodation form on the detail page.
- Backlink on `/waypoints/[slug]` routes back to the originating stage view; falls back to `/caminos` when the stage context is unavailable.

## Open questions at ticket write time

1. Is `type` required on existing (pre-migration) accommodation rows? If so, a default must be chosen for the migration (recommended: `hostel` as neutral default).
2. Should `website` be rendered as a clickable link on the detail card immediately, or deferred to a later phase?
3. What constitutes "verification links" — are these external URLs (e.g. official registration sites) or an internal admin workflow?
4. How is the originating stage context passed to the waypoint page for the backlink? Likely a `?from=stage-slug` query param; architect must confirm.
5. Should Accommodation and Sight get dedicated detail pages at `/accommodations/[id]` and `/sights/[id]`, or is the inline card view on `/waypoints/[slug]` sufficient for this iteration?

## Testing scope

- Backend: Vitest unit tests for new `AccommodationsService` and `SightsService` (CRUD methods). DTOs validated with class-validator unit tests.
- E2E (Playwright): `waypoint-poi-edit-delete.spec.ts` — pilgrim edit happy path, pilgrim delete with confirmation, unauthenticated edit attempt redirects, non-pilgrim role sees no edit/delete controls.
