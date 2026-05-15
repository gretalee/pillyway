---
ticket: PILLY-POI-001
title: "Extend Accommodation and Sight forms and views — new fields, edit/delete flows, domain separation, backlink fix"
type: Feature
priority: High
status: Ready for development
---

# PILLY-POI-001 — Extend Accommodation and Sight Forms and Views

## Feature Summary

Accommodation and Sight entities currently hold only name, description, and images. This ticket extends both with the structured data fields required for practical route planning (type, contact details, pricing, address, geo-coordinates), adds full edit and delete flows for authenticated pilgrims — including image removal on both edit forms — splits the two entities into dedicated backend modules, introduces public detail endpoints, and fixes the waypoint detail page backlink to navigate back via browser history.

---

## User Personas

**Pilgrim (role: `pilgrim`)**
A registered user who actively contributes route data. They have first-hand knowledge of accommodations and sights on a pilgrimage route. They need to create accurate, richly attributed entries, correct mistakes after the fact, and remove outdated images — all without asking an admin for a database fix.

**Route Viewer (unauthenticated or any authenticated user)**
A prospective pilgrim researching a route. They need actionable information — accommodation type, price range, contact email, website, address — to plan their journey. They can view all data but cannot modify it.

---

## User Stories

1. As a pilgrim, I want to specify the accommodation type, price range, contact email, website, and structured address when creating or editing an accommodation, so that route viewers have actionable planning data.

2. As a pilgrim, I want to edit an existing accommodation I or another pilgrim entered, so that I can correct inaccurate details without needing database access.

3. As a pilgrim, I want to delete an accommodation or sight that is irrelevant or duplicate, so that the route data stays clean.

4. As a pilgrim, I want to remove individual images from an accommodation or sight during editing, so that outdated or incorrect photos do not mislead viewers.

5. As a pilgrim, I want to add an optional address and geo-coordinates to a sight, so that viewers can orient themselves on a map (current or future).

6. As a route viewer, I want the accommodation type, price range, website, and verified status to be visible on the waypoint detail page, so that I can quickly assess whether an accommodation fits my needs.

7. As a route viewer, I want the backlink on the waypoint detail page to return me to the page I came from, so that I can continue navigating the route without losing my place.

---

## Domain Model Changes

### Architecture Decision — Separate Accommodation and Sight as Distinct Backend Domains

**Recommendation: accepted.** Accommodation and Sight must be extracted from the shared `waypoints` NestJS module into independent modules (`AccommodationsModule` and `SightsModule`). The `waypoints` module retains only the POST creation endpoints (`POST /api/waypoints/:slug/accommodations` and `POST /api/waypoints/:slug/sights`) and its own waypoint lookup. All standalone CRUD operations on accommodations and sights are handled by the new dedicated modules.

**Rationale:**
- Accommodations will gain verification workflows, user reviews, and richer contact/pricing attributes in future phases. Sights will not.
- The attribute sets already diverge materially in this ticket and will diverge further.
- Keeping both as a generic "waypoint sub-type" creates coupling that makes independent iteration on either domain difficult.
- A clean module boundary now avoids a more disruptive refactor later.

**Module boundary (confirmed — Open Question #6 resolved):** `WaypointsModule` does **not** aggregate accommodation and sight data. The waypoint detail page fetches accommodations and sights via separate API calls to the new dedicated endpoints. `WaypointsService.findBySlug` therefore does not query accommodations or sights and does not need to import `AccommodationsModule` or `SightsModule`.

---

### Prisma Schema Changes

#### Accommodation model — new fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | `AccommodationType` (enum) | Yes | Required on create; migration default: `hostel` for existing rows |
| `email` | `String?` | No | Free-text; DTO validates with `@IsEmail()` |
| `website` | `String?` | No | DTO validates with `@IsUrl()` |
| `addressStreet` | `String?` | No | Street name + number combined (`"Calle Mayor 12"`) |
| `addressZip` | `String?` | No | Postal / ZIP code |
| `addressCity` | `String?` | No | City name |
| `addressCountry` | `String?` | No | Country name (free-text, not an enum) |
| `priceRange` | `PriceRange` (enum) | No | See enum values below |

Enum `AccommodationType`:
```
hostel | monastery | b_and_b | hotel | apartment | private_room
```

Enum `PriceRange`:
```
budget | moderate | comfortable | luxury
```
Display in the UI as: `€`, `€€`, `€€€`, `€€€€` respectively.

Existing fields retained unchanged: `id`, `caminoPointId`, `name`, `description`, `imageUrls`, `verified`, `createdBy`, `createdAt`, `updatedAt`.

#### Sight model — new fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `address` | `String?` | No | Free-text, single field (e.g. `"Piazza del Duomo, Florence"`) |
| `latitude` | `Float?` | No | WGS 84 decimal degrees |
| `longitude` | `Float?` | No | WGS 84 decimal degrees |

`latitude` and `longitude` are independent optional fields. Both may be null. If one is provided the other should also be provided — enforce this at the DTO level with a custom validator (`@ValidateIf`).

Existing fields retained unchanged: `id`, `caminoPointId`, `name`, `description`, `imageUrls`, `verified`, `createdBy`, `createdAt`, `updatedAt`.

#### Migration

Migration name: `add-accommodation-type-contact-price-address-and-sight-address-location`

The migration SQL must:
1. Create the `AccommodationType` and `PriceRange` Postgres enums before altering the table.
2. Add `type` as `NOT NULL` with default `'hostel'` so existing rows are backfilled automatically. `hostel` is the confirmed migration default.
3. Add all other new columns as `NULL`-able with no default.

---

## API Contract Changes

All endpoints below are prefixed with `/api`.

### New: Accommodations Module (`/api/accommodations`)

#### GET `/api/accommodations/:id` — Public

Returns full accommodation detail including all new fields. The waypoint detail page uses this endpoint (alongside `GET /api/sights?caminoPointId=:id`) to load accommodation data separately from the waypoint lookup.

Response `200 AccommodationDetailDto`:
```json
{
  "id": "uuid",
  "caminoPointId": "uuid",
  "name": "string",
  "description": "string | null",
  "imageUrls": ["string"],
  "verified": true,
  "type": "hostel",
  "email": "string | null",
  "website": "string | null",
  "addressStreet": "string | null",
  "addressZip": "string | null",
  "addressCity": "string | null",
  "addressCountry": "string | null",
  "priceRange": "budget | null",
  "createdBy": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

Errors: `404` when ID not found.

#### GET `/api/accommodations?caminoPointId=:id` — Public

Returns all accommodations for a given waypoint (camino point). Used by the waypoint detail page to load the accommodation list independently.

Response `200 AccommodationDetailDto[]`.

Errors: `400` when `caminoPointId` query param is missing.

#### PATCH `/api/accommodations/:id` — Protected (`pilgrim` role)

Partial update. At least one field must be present in the body (validated via `@ValidateIf` or a class-level guard). All fields are optional in the DTO.

**Image deletion** is handled via a `removeImageUrls` field in this PATCH body. The backend filters the current `imageUrls` array, removes any URLs present in `removeImageUrls`, and persists the result. This approach avoids a separate DELETE sub-resource endpoint and keeps image removal atomic with other field changes. Clients may send `removeImageUrls` alone (without any other field change) to remove images only; this counts as a valid non-empty body.

Request body `UpdateAccommodationDto` (all fields optional, at least one required):
```json
{
  "name": "string",
  "description": "string | null",
  "imageUrls": ["string"],
  "removeImageUrls": ["string"],
  "type": "AccommodationType",
  "email": "string | null",
  "website": "string | null",
  "addressStreet": "string | null",
  "addressZip": "string | null",
  "addressCity": "string | null",
  "addressCountry": "string | null",
  "priceRange": "PriceRange | null"
}
```

Notes on `removeImageUrls`:
- `removeImageUrls` and `imageUrls` are mutually exclusive in the same request. If both are present, the backend returns `400`.
- `imageUrls` replaces the entire image list (existing upload behaviour). `removeImageUrls` removes individual URLs from the existing list.
- URLs in `removeImageUrls` that are not present in the stored list are silently ignored.

Response `200 AccommodationDetailDto` (same shape as GET).

Errors: `400` if body is empty or both `imageUrls` and `removeImageUrls` are sent together; `401` missing JWT; `403` not pilgrim; `404` not found.

#### DELETE `/api/accommodations/:id` — Protected (`pilgrim` role)

Response: `204 No Content`.

Errors: `401`, `403`, `404`.

---

### New: Sights Module (`/api/sights`)

#### GET `/api/sights/:id` — Public

Response `200 SightDetailDto`:
```json
{
  "id": "uuid",
  "caminoPointId": "uuid",
  "name": "string",
  "description": "string | null",
  "imageUrls": ["string"],
  "verified": true,
  "address": "string | null",
  "latitude": "number | null",
  "longitude": "number | null",
  "createdBy": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

Errors: `404`.

#### GET `/api/sights?caminoPointId=:id` — Public

Returns all sights for a given waypoint. Used by the waypoint detail page to load the sights list independently.

Response `200 SightDetailDto[]`.

Errors: `400` when `caminoPointId` query param is missing.

#### PATCH `/api/sights/:id` — Protected (`pilgrim` role)

Partial update. Image deletion follows the same `removeImageUrls` pattern as accommodations.

Request body `UpdateSightDto` (all fields optional, at least one required):
```json
{
  "name": "string",
  "description": "string | null",
  "imageUrls": ["string"],
  "removeImageUrls": ["string"],
  "address": "string | null",
  "latitude": "number | null",
  "longitude": "number | null"
}
```

Same mutual-exclusion rule: `imageUrls` and `removeImageUrls` may not appear together.

Response `200 SightDetailDto`.

Errors: `400`, `401`, `403`, `404`.

#### DELETE `/api/sights/:id` — Protected (`pilgrim` role)

Response: `204 No Content`.

Errors: `401`, `403`, `404`.

---

### Modified: Waypoints Module

#### POST `/api/waypoints/:slug/accommodations` — Modified

Extended to accept all new accommodation fields. `type` is now required.

New required field in `CreateAccommodationDto`:
- `type: AccommodationType`

New optional fields:
- `email?: string`
- `website?: string`
- `addressStreet?: string`
- `addressZip?: string`
- `addressCity?: string`
- `addressCountry?: string`
- `priceRange?: PriceRange`

Response shape: `AccommodationDetailDto` (same as GET `/api/accommodations/:id`).

#### POST `/api/waypoints/:slug/sights` — Modified

New optional fields in `CreateSightDto`:
- `address?: string`
- `latitude?: number`
- `longitude?: number`

Response shape: `SightDetailDto` (same as GET `/api/sights/:id`).

#### GET `/api/waypoints/:slug` — Unchanged (response shape trimmed)

`GET /api/waypoints/:slug` returns waypoint metadata only (name, slug, description, location fields, stage reference). It does **not** aggregate accommodations or sights in its response. The waypoint detail page fetches those via the new dedicated list endpoints (`GET /api/accommodations?caminoPointId=:id` and `GET /api/sights?caminoPointId=:id`) with separate client-side queries.

`WaypointDetailDto` therefore no longer contains `accommodations[]` or `sights[]` arrays. Any existing fields in those arrays should be removed from the DTO if they were only there for the detail view aggregation.

---

## Frontend Component Inventory

### Modified pages and components

| File | Change |
|---|---|
| `apps/frontend/app/waypoints/[slug]/page.tsx` | No `searchParams` or `from` param needed. `router.back()` is handled client-side. No prop changes required for backlink. |
| `apps/frontend/app/waypoints/[slug]/components/WaypointDetailView.tsx` | (1) Replace hardcoded `/caminos` back href with a `router.back()` call; see Backlink section below. (2) Render a verification-links placeholder section heading above the accommodation list. (3) Load accommodations and sights via separate `useAccommodationsByWaypoint` and `useSightsByWaypoint` hooks instead of reading from the waypoint response. (4) Pass full detail data to `AccommodationCard` and `SightCard`. |
| `apps/frontend/app/waypoints/[slug]/components/AccommodationCard` | Show `type` badge, `priceRange` symbol (€/€€/€€€/€€€€), `email`, `website` (clickable external link), address block. Add edit (pencil) and delete (trash) icon buttons — visible only when `canContribute`. |
| `apps/frontend/app/waypoints/[slug]/components/SightCard` | Show `address` when present. Add edit and delete buttons — visible only when `canContribute`. |
| `apps/frontend/app/waypoints/[slug]/accommodations/new/components/AddAccommodationForm.tsx` | Add fields: `type` (Select, required), `email` (Input), `website` (Input), `addressStreet` / `addressZip` / `addressCity` / `addressCountry` (four Inputs), `priceRange` (Select, optional). Use react-hook-form to replace manual `useState` per field. |
| `apps/frontend/app/waypoints/[slug]/sights/new/components/AddSightForm.tsx` | Add fields: `address` (Input, optional), `latitude` / `longitude` (two number Inputs, optional, co-validated). Use react-hook-form. |
| `apps/frontend/app/api/waypoints/waypoint-types.ts` | Remove `accommodations[]` and `sights[]` from `WaypointDetailDto` (no longer returned by the endpoint). Add `AccommodationType` and `PriceRange` TypeScript union types or re-export from the new domain type files. |

### New components

| File | Purpose |
|---|---|
| `apps/frontend/app/waypoints/[slug]/accommodations/[id]/edit/page.tsx` | Edit accommodation page — full dedicated page (confirmed). Server component shell that fetches current accommodation data and passes it as default values to the form. |
| `apps/frontend/app/waypoints/[slug]/accommodations/[id]/edit/components/EditAccommodationForm.tsx` | Pre-filled edit form reusing same field set as `AddAccommodationForm`, plus image removal UI (see below). Wired to `useUpdateAccommodation`. |
| `apps/frontend/app/waypoints/[slug]/sights/[id]/edit/page.tsx` | Edit sight page — full dedicated page. |
| `apps/frontend/app/waypoints/[slug]/sights/[id]/edit/components/EditSightForm.tsx` | Pre-filled edit form wired to `useUpdateSight`, with image removal UI. |
| `apps/frontend/app/waypoints/[slug]/components/DeleteAccommodationDialog.tsx` | shadcn `AlertDialog` wrapping `useDeleteAccommodation`. |
| `apps/frontend/app/waypoints/[slug]/components/DeleteSightDialog.tsx` | shadcn `AlertDialog` wrapping `useDeleteSight`. |

### Image removal UI (both edit forms)

The edit forms for accommodation and sight must render the existing images as removable thumbnails. Each thumbnail has an `×` / remove button. Clicking remove marks that URL for deletion (adds it to a local `removeImageUrls` state array and visually removes the thumbnail). On form submit, the `removeImageUrls` array is included in the PATCH body. No separate API call is made for image removal — it is part of the same PATCH request.

- The remove button is always visible on every existing image thumbnail (not toggle-hidden).
- When all existing images are removed, the images section shows an empty state ("No images") rather than crashing.
- Users may not remove all images and upload new ones in the same request — if they need to replace images entirely, they must first submit the removal, then upload new ones in a separate edit. (This keeps the `imageUrls` / `removeImageUrls` mutual exclusion rule simple to enforce.)

---

## Frontend API Layer

All new files follow the `fetch-[domain].ts` / `use-[domain].ts` split. Files live under their own domain directory, not under `apps/frontend/app/api/waypoints/`.

### `apps/frontend/app/api/accommodations/`

| File | Exports | Notes |
|---|---|---|
| `accommodation-types.ts` | `AccommodationDetail`, `UpdateAccommodationPayload`, `AccommodationType`, `PriceRange` | TypeScript types for the new domain |
| `fetch-accommodation.ts` | `fetchAccommodation(id: string): Promise<AccommodationDetail>` | Pure async fetch; usable in server components |
| `use-accommodation.ts` | `useAccommodation(id: string)` | TanStack Query `useQuery` wrapping `fetchAccommodation` |
| `use-accommodations-by-waypoint.ts` | `useAccommodationsByWaypoint(caminoPointId: string)` | `useQuery` calling `GET /api/accommodations?caminoPointId=:id`; replaces reading from the waypoint response |
| `use-update-accommodation.ts` | `useUpdateAccommodation(id: string)` | `useMutation` calling `PATCH /api/accommodations/:id`; sends `removeImageUrls` when present; invalidates `['accommodations', caminoPointId]` on success |
| `use-delete-accommodation.ts` | `useDeleteAccommodation(id: string)` | `useMutation` calling `DELETE /api/accommodations/:id`; invalidates `['accommodations', caminoPointId]` on success |

### `apps/frontend/app/api/sights/`

| File | Exports | Notes |
|---|---|---|
| `sight-types.ts` | `SightDetail`, `UpdateSightPayload` | TypeScript types for the new domain |
| `fetch-sight.ts` | `fetchSight(id: string): Promise<SightDetail>` | Pure async fetch; usable in server components |
| `use-sight.ts` | `useSight(id: string)` | TanStack Query `useQuery` wrapping `fetchSight` |
| `use-sights-by-waypoint.ts` | `useSightsByWaypoint(caminoPointId: string)` | `useQuery` calling `GET /api/sights?caminoPointId=:id`; replaces reading from the waypoint response |
| `use-update-sight.ts` | `useUpdateSight(id: string)` | `useMutation` calling `PATCH /api/sights/:id`; sends `removeImageUrls` when present; invalidates `['sights', caminoPointId]` on success |
| `use-delete-sight.ts` | `useDeleteSight(id: string)` | `useMutation` calling `DELETE /api/sights/:id`; invalidates `['sights', caminoPointId]` on success |

### Modified: `apps/frontend/app/api/waypoints/`

| File | Change |
|---|---|
| `waypoint-types.ts` | Remove `accommodations[]` and `sights[]` from `WaypointDetailDto`. Add `AccommodationType` and `PriceRange` union types or re-export from the new domain type files. |
| `use-create-accommodation.ts` | Accept and pass through new fields in `CreateAccommodationPayload` (including `type` as required) |
| `use-create-sight.ts` | Accept and pass through `address`, `latitude`, `longitude` in `CreateSightPayload` |

> Auth token injection: `useUpdateAccommodation`, `useDeleteAccommodation`, `useUpdateSight`, `useDeleteSight` must retrieve `accessTokenEncoded` from `useKindeBrowserClient` internally. Components must not access the token directly.

---

## Auth and Access Rules

| Operation | Required role | Notes |
|---|---|---|
| View waypoint detail page (`GET /waypoints/:slug`) | None | Publicly accessible, server-side rendered |
| View accommodation list (`GET /api/accommodations?caminoPointId=:id`) | None | Public |
| View accommodation detail (`GET /api/accommodations/:id`) | None | Public |
| View sight list (`GET /api/sights?caminoPointId=:id`) | None | Public |
| View sight detail (`GET /api/sights/:id`) | None | Public |
| Create accommodation | `pilgrim` | JWT required; `@Roles('pilgrim')` guard; `owner` users also hold `pilgrim` in Kinde |
| Create sight | `pilgrim` | Same as above |
| Edit accommodation (including image removal) | `pilgrim` | No per-entity ownership check — role alone grants access |
| Delete accommodation | `pilgrim` | No per-entity ownership check |
| Edit sight (including image removal) | `pilgrim` | No per-entity ownership check |
| Delete sight | `pilgrim` | No per-entity ownership check |

Frontend enforcement: edit/delete buttons on `AccommodationCard` and `SightCard` are rendered only when `canContribute === true` (`user?.roles.some(r => r.key === 'pilgrim')`). The backend is the authoritative access gate.

---

## Navigation: Backlink

**Current behaviour:** The back link on `/waypoints/[slug]` hardcodes `href="/caminos"`.

**Required behaviour (confirmed — Open Question #3 / #4 resolved):** The back link must call `router.back()` to navigate to wherever the user came from — most commonly the stage view they were browsing. No `from` query parameter is needed or used.

**Implementation:**
- Replace the hardcoded `<Link href="/caminos">` with a `<button onClick={() => router.back()}>` (or an `<a>` with an `onClick` handler if a link element is preferred for accessibility).
- When the browser history stack is empty (e.g. user opened the waypoint URL directly in a new tab), `router.back()` has no effect. Guard against this: before calling `router.back()`, check `window.history.length > 1`. If history is unavailable or the stack is empty, fall back to `router.push('/caminos')`.
- The button label uses the i18n key `back_label` (a single label is sufficient since the destination is dynamic).
- `router` here refers to `next/navigation`'s `useRouter` hook; this component is therefore a client component.
- No `searchParams` prop changes are needed on `WaypointDetailPage`.

---

## Verification Links Section

**Decision (confirmed — Open Question #2 resolved):** Out of scope for this ticket. Render a placeholder section heading (`<h2>` or equivalent) with the i18n key `verification_links_heading` above the accommodation list. No links, no functionality, no additional markup. This heading reserves the visual slot for a future ticket.

---

## i18n

New keys required in the following namespaces:

**`waypoint_detail` namespace** (existing):
- `accommodation_type.hostel`, `.monastery`, `.b_and_b`, `.hotel`, `.apartment`, `.private_room`
- `price_range.budget` (€), `.moderate` (€€), `.comfortable` (€€€), `.luxury` (€€€€)
- `edit_accommodation_label`, `delete_accommodation_label`
- `edit_sight_label`, `delete_sight_label`
- `delete_confirmation_title`, `delete_confirmation_description`, `delete_confirm_action`, `delete_cancel_action`
- `verification_links_heading`
- `back_label`

**`accommodation_new` namespace** (existing — add):
- `field_type`, `field_email`, `field_website`
- `field_address_street`, `field_address_zip`, `field_address_city`, `field_address_country`
- `field_price_range`
- `error_type_required`

**`sight_new` namespace** (existing — add):
- `field_address`, `field_latitude`, `field_longitude`
- `error_lat_lon_incomplete` (shown when only one of lat/lon is filled)

**New namespace `accommodation_edit`** (dedicated edit page):
- Same field keys as `accommodation_new`, plus:
- `submit_label` (e.g. "Save changes")
- `remove_image_label`, `images_empty_state`

**New namespace `sight_edit`**:
- Same field keys as `sight_new`, plus:
- `submit_label`
- `remove_image_label`, `images_empty_state`

---

## Acceptance Criteria

### Accommodation — new fields on create

- [ ] The create accommodation form renders: Type (required Select), Email (optional Input), Website (optional Input), Address Street / Zip / City / Country (four optional Inputs), Price Range (optional Select).
- [ ] Submitting the form without selecting a Type shows a validation error; the form does not submit.
- [ ] A valid submission creates the accommodation with all provided fields persisted.
- [ ] `POST /api/waypoints/:slug/accommodations` returns `400` when `type` is missing.

### Accommodation — new fields displayed

- [ ] `AccommodationCard` on `/waypoints/[slug]` displays the accommodation type as a readable badge (e.g. "Hostel").
- [ ] Price range is displayed as `€`, `€€`, `€€€`, or `€€€€` when present; nothing is rendered when absent.
- [ ] Email is displayed; when present it renders as a `mailto:` link.
- [ ] Website is displayed as a clickable external link (`target="_blank" rel="noopener noreferrer"`) when present.
- [ ] Address fields (street, zip, city, country) are displayed as a formatted address block when at least one is present.
- [ ] Verified status badge is visible on `AccommodationCard` when `verified === true`.

### Accommodation — edit flow

- [ ] Pilgrim sees edit (pencil) icon on every `AccommodationCard`; unauthenticated users and non-pilgrim roles do not.
- [ ] Clicking edit navigates to the dedicated edit page pre-filled with the current values of all fields.
- [ ] Existing images are rendered as thumbnails with a remove (×) button on the edit form.
- [ ] Clicking a remove button marks that image for deletion; the thumbnail is visually removed immediately.
- [ ] Submitting the edit form calls `PATCH /api/accommodations/:id` with `removeImageUrls` populated when images were removed; the card updates without a full page reload.
- [ ] `PATCH /api/accommodations/:id` returns `403` when called without a pilgrim JWT.
- [ ] `PATCH /api/accommodations/:id` returns `404` when the ID does not exist.
- [ ] `PATCH /api/accommodations/:id` returns `400` when the request body is empty.
- [ ] `PATCH /api/accommodations/:id` returns `400` when both `imageUrls` and `removeImageUrls` are present.

### Accommodation — delete flow

- [ ] Pilgrim sees delete (trash) icon on every `AccommodationCard`; unauthenticated users and non-pilgrim roles do not.
- [ ] Clicking delete opens an `AlertDialog` with a confirmation prompt.
- [ ] Confirming the dialog calls `DELETE /api/accommodations/:id`; the card is removed from the list without a full page reload.
- [ ] Cancelling the dialog makes no API call.
- [ ] `DELETE /api/accommodations/:id` returns `204` on success.
- [ ] `DELETE /api/accommodations/:id` returns `403` when called without a pilgrim JWT.

### Sight — new fields on create

- [ ] The create sight form renders: Address (optional Input), Latitude (optional number Input), Longitude (optional number Input).
- [ ] Submitting with only latitude filled (no longitude) shows a validation error and does not submit (and vice versa).
- [ ] A valid submission persists the new fields.

### Sight — new fields displayed

- [ ] `SightCard` displays the address when present.

### Sight — edit flow (image removal)

- [ ] Existing images are rendered as thumbnails with a remove (×) button on the sight edit form.
- [ ] Submitting the sight edit form calls `PATCH /api/sights/:id` with `removeImageUrls` populated when images were removed.

### Sight — edit and delete (all other criteria)

- [ ] All remaining edit and delete acceptance criteria from the Accommodation section apply identically to Sights (substituting `PATCH /api/sights/:id` and `DELETE /api/sights/:id`).

### Backlink

- [ ] Given: user navigates from any page to `/waypoints/<waypointSlug>` and then clicks the back link, `router.back()` is called and the browser navigates to the previous history entry.
- [ ] Given: user opens `/waypoints/<waypointSlug>` directly (no prior history), the back link calls `router.push('/caminos')` as fallback.
- [ ] No `from` query parameter is used anywhere in the backlink flow.

### Verification links

- [ ] A section with the i18n heading `verification_links_heading` is rendered above the accommodation list on the waypoint detail page.
- [ ] The section contains no links, no interactive elements, and no functional content.

### Waypoint detail — separate data loading

- [ ] The waypoint detail page loads accommodations via `useAccommodationsByWaypoint(caminoPointId)` (calls `GET /api/accommodations?caminoPointId=:id`).
- [ ] The waypoint detail page loads sights via `useSightsByWaypoint(caminoPointId)` (calls `GET /api/sights?caminoPointId=:id`).
- [ ] `GET /api/waypoints/:slug` response does not contain `accommodations[]` or `sights[]` arrays.

### API layer

- [ ] All new fetch functions in `apps/frontend/app/api/accommodations/` and `apps/frontend/app/api/sights/` follow the `fetch-[domain].ts` / `use-[domain].ts` split.
- [ ] No new bare `fetch` calls exist inside React components.
- [ ] Auth token is retrieved inside the hook, never passed in from the component.

### Backend

- [ ] All new endpoints are documented in Swagger (`GET /api/docs`).
- [ ] Accommodation and Sight logic lives in independent NestJS modules (`AccommodationsModule`, `SightsModule`), not in `WaypointsModule`.
- [ ] `WaypointsModule` does not import or depend on `AccommodationsModule` or `SightsModule`.
- [ ] `PATCH /api/accommodations/:id` and `PATCH /api/sights/:id` correctly remove URLs in `removeImageUrls` from the stored `imageUrls` array and persist the result.
- [ ] Sending both `imageUrls` and `removeImageUrls` in the same PATCH request returns `400`.

---

## Edge Cases and Error Handling

| Scenario | Expected behaviour |
|---|---|
| User submits edit form with no changes | `PATCH` returns `400` (empty body); form shows generic error message |
| Website URL is entered without `https://` | DTO `@IsUrl()` rejects it; form shows inline validation error |
| Both latitude and longitude are null | Valid — no error |
| Only one of latitude/longitude is provided | DTO custom validator rejects; form shows error: "Please enter both latitude and longitude or leave both empty" |
| Pilgrim deletes an accommodation that another pilgrim is simultaneously viewing | The viewing user will see a 404 on next refresh — acceptable; no special handling required |
| Non-existent accommodation ID in PATCH/DELETE | `404 Not Found` |
| Unauthenticated request to PATCH/DELETE | `401 Unauthorized` |
| Non-pilgrim authenticated user calls PATCH/DELETE | `403 Forbidden` |
| `removeImageUrls` contains a URL not in `imageUrls` | Silently ignored; no error |
| `removeImageUrls` empties the entire `imageUrls` array | Valid — `imageUrls` is persisted as `[]`; edit form shows empty state |
| Both `imageUrls` and `removeImageUrls` sent in same PATCH | `400 Bad Request` |
| User opens waypoint URL directly (no browser history) | Back link falls back to `router.push('/caminos')` |

---

## Out of Scope

- User reviews on accommodations (later phase).
- Verification workflow — the admin flow for setting `verified = true` is not part of this ticket. The section heading is a placeholder only.
- Map rendering for sight geo-coordinates (later phase).
- Accommodation detail page at `/accommodations/:id` (separate ticket if needed).
- Sight detail page at `/sights/:id` (separate ticket if needed).
- `priceRange` display via currency symbol conversion — the `€/€€/€€€/€€€€` mapping is hardcoded in the frontend; no backend change required.
- Inline sheet / drawer edit pattern — full dedicated edit page only for this iteration.
- Image upload on edit forms — adding new images is deferred; only removal of existing images is in scope for this ticket.

---

## Dependencies

- Prisma migration `add-accommodation-type-contact-price-address-and-sight-address-location` must be applied before backend service code is runnable.
- `AccommodationsModule` and `SightsModule` are fully independent of `WaypointsModule` — no cross-module service injection required.
- `shadcn/ui` `AlertDialog` component must be added (`npx shadcn@latest add alert-dialog` from `apps/frontend/`) if not already installed.
- `react-hook-form` must be available as a frontend dependency. Confirm before implementation.

---

## Open Questions

All open questions from the previous draft are resolved. No open questions remain.

| # | Question | Resolution |
|---|---|---|
| 1 | Migration default for `type` | `hostel` is the confirmed default for existing rows. |
| 2 | Website rendering | Include `website` as a clickable external link in this ticket. |
| 3 | Verification links content | Out of scope. Render a placeholder section heading only — no links, no functionality. |
| 4 | Backlink — stage URL shape | No `from` param. Use `router.back()`; fall back to `/caminos` when history is empty. |
| 5 | Edit UI pattern — full page vs. inline sheet | Full dedicated edit page confirmed. |
| 6 | Module boundary for `GET /waypoints/:slug` | Remove aggregation from `WaypointsModule`. The waypoint detail page calls the new accommodation and sight list endpoints directly. `WaypointsService.findBySlug` does not query accommodations or sights. |
| 7 | (New) Image deletion | Images must be removable on edit forms for both accommodations and sights. Handled via `removeImageUrls` field in the PATCH body. |

---

## Definition of Done

- [ ] Prisma migration created, reviewed, and applied to local and staging databases.
- [ ] `AccommodationsModule` and `SightsModule` implemented with all CRUD + list endpoints, DTOs, and guards.
- [ ] `PATCH` handlers for both modules correctly process `removeImageUrls` (filter and persist the updated `imageUrls` array); reject requests where both `imageUrls` and `removeImageUrls` are present.
- [ ] `WaypointsModule` updated: creation endpoints accept new fields; `GET /waypoints/:slug` no longer returns `accommodations[]` or `sights[]`; module does not import `AccommodationsModule` or `SightsModule`.
- [ ] All new endpoints documented in Swagger.
- [ ] Vitest unit tests written for `AccommodationsService` (create, update, delete, image removal) and `SightsService` (create, update, delete, image removal).
- [ ] DTO unit tests cover: `type` required on accommodation create; lat/lon pair logic on sight create/update; `removeImageUrls` / `imageUrls` mutual exclusion.
- [ ] `AddAccommodationForm` and `AddSightForm` extended with new fields and migrated to react-hook-form.
- [ ] Edit form components created for accommodation and sight (full dedicated pages); image removal UI (thumbnail grid with × buttons) implemented on both edit forms.
- [ ] Delete confirmation dialog implemented for both entities; delete flow removes the card from the UI on success.
- [ ] `AccommodationCard` renders type badge, price range (€ symbols), email (`mailto:` link), website (external link), address block, verified badge.
- [ ] `SightCard` renders address when present.
- [ ] Verification links section heading rendered above the accommodation section on the waypoint detail page (placeholder only).
- [ ] Back link on waypoint detail page calls `router.back()`; falls back to `router.push('/caminos')` when history is empty.
- [ ] Waypoint detail page loads accommodations and sights via `useAccommodationsByWaypoint` and `useSightsByWaypoint` hooks (separate API calls to dedicated endpoints).
- [ ] All new frontend API files follow the `fetch-[domain].ts` / `use-[domain].ts` pattern.
- [ ] Auth token retrieved inside hooks; no component accesses `accessTokenEncoded` directly.
- [ ] All new i18n keys added to both `de` and `en` locale files (DE as primary locale per project convention).
- [ ] E2E spec `waypoint-poi-edit-delete.spec.ts` covers: pilgrim edit happy path (including removing an image), pilgrim delete with confirmation, unauthenticated user sees no edit/delete controls, non-pilgrim role sees no edit/delete controls.
- [ ] No `test.skip()` or `testInfo.skip()` calls in the spec.
- [ ] All CI checks (lint, type-check, unit tests, E2E) pass on the feature branch.
- [ ] PR approved by a human reviewer before merge to `main`.
