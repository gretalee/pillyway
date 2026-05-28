# PILLY-CAM-003 — Camino Pictures: Main Image and Gallery

**Type:** Feature
**Priority:** High — Pictures are the primary visual signal that communicates the character of a camino to visitors. No image support currently exists for the core entity.

---

## 1. Summary

Allow pilgrims to upload a main picture and a gallery of additional pictures for a camino, allow visitors to view and navigate through them fullscreen, and allow pilgrims and owners to delete pictures under role-specific rules.

---

## 2. User Stories

**US-1 — Visitor views camino pictures**
As a visitor (unauthenticated or any role), I want to see the camino's main picture above the description and a gallery of additional pictures below the verification section, so that I can visually evaluate the camino before reading its details.

**US-2 — Pilgrim uploads a main picture**
As a pilgrim, I want to upload a main picture for a camino that currently has no main picture, so that I can give the camino a representative visual identity.

**US-3 — Pilgrim uploads gallery pictures**
As a pilgrim, I want to upload one or more pictures to the camino's gallery, so that I can enrich the camino page with additional visual context.

**US-4 — Visitor opens a picture fullscreen**
As a visitor, I want to click any picture (main or gallery) to open it fullscreen, so that I can see its detail without leaving the page.

**US-5 — Visitor navigates the gallery fullscreen**
As a visitor, I want to use previous and next controls inside the fullscreen view to navigate through all gallery images in order, so that I can browse the gallery without closing and reopening individual pictures.

**US-6 — Pilgrim deletes their own picture**
As a pilgrim, I want to delete a picture I uploaded (whether it is the main picture or a gallery picture), so that I can correct mistakes or remove outdated images.

**US-7 — Owner deletes any picture**
As an owner (who also holds the pilgrim role), I want to delete any picture on any camino regardless of who uploaded it, so that I can moderate content and remove inappropriate or low-quality images.

---

## 3. Functional Requirements

### Upload

1. A `CaminoPicture` record must store: a reference to the camino, the uploader's Kinde user ID, the public S3 URL, a flag indicating whether it is the primary picture, a sort position within the gallery, and timestamps.
2. A camino may have at most one picture where `isPrimary = true`. This constraint is enforced at the database level (unique partial index) and at the application level.
3. Any authenticated pilgrim may upload a picture to a camino as a gallery picture (non-primary) at any time. There is no per-camino ownership requirement for upload.
4. A pilgrim may upload a primary picture **only if the camino has no existing primary picture**. The backend must reject the request with `409 Conflict` if a primary picture already exists when the upload request arrives.
5. A camino may have at most **50 pictures in total** (primary + gallery combined). The count check and insert must be wrapped in a Prisma transaction to prevent concurrent uploads from exceeding this limit. The backend rejects any upload that would exceed this limit with `422 Unprocessable Entity` and body `{ "message": "This camino has reached the maximum of 50 pictures." }`. The frontend hides the upload controls (both main and gallery) once the limit is reached and shows an inline message i18n key `camino_detail.pictures.limit_reached` (DE: "Maximale Bildanzahl (50) erreicht.").
6. Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`. MIME validation is two-layered: (a) the declared `Content-Type` header is checked by `FileTypeValidator`, and (b) the actual file bytes are inspected using the `file-type` npm package after multer receives the buffer. If the detected magic-byte type does not match the declared MIME or is not in the allowed set, the request is rejected with `415 Unsupported Media Type`. The browser-supplied header alone is not sufficient.
7. Maximum file size per upload: **10 MB**. The backend rejects files exceeding this limit with `413 Payload Too Large`.
8. The backend uploads the file to S3, stores the resulting public URL in the database, and returns the created `CaminoPicture` record. The frontend never uploads directly to S3. The `uploadedBy` field is always sourced from `req.user.sub` (the verified JWT subject) and must never be accepted from the request body or DTO.
9. Gallery pictures are ordered by their `position` field (ascending). When a new gallery picture is uploaded, it receives `position = (current max position + 1)`. If no gallery pictures exist yet, position starts at 1.
10. Uploading a primary picture sets `isPrimary = true`; it does not participate in the gallery position ordering (its `position` is `null`).

### Display

11. The main picture (where `isPrimary = true`) is displayed in a full-width hero slot above the camino description on the detail page. If no primary picture exists, the hero slot is not rendered; there is no placeholder image.
12. The gallery section is rendered below the verification section on the detail page. If the camino has zero gallery pictures, the gallery section is not rendered; there is no empty-state placeholder.
13. Gallery pictures are rendered as a responsive grid of thumbnails, ordered by `position` ascending.
14. Every picture (main and gallery) is clickable. Clicking any picture opens the lightbox in fullscreen mode.
15. When the lightbox is opened from the main picture, it displays only that one image with no prev/next controls (the main picture is not part of the gallery sequence).
16. When the lightbox is opened from a gallery thumbnail, it opens at the selected image's position within the ordered gallery sequence, with prev and next controls.
17. The lightbox must be dismissible by: clicking outside the image, pressing the Escape key, and clicking an explicit close button.

### Deletion

18. A pilgrim may delete a picture only if `uploadedBy` matches their Kinde user ID. The backend enforces this check and returns `403 Forbidden` if the IDs do not match.
19. An owner (a user holding the `pilgrim` role and the `owner` role in Kinde) may delete any picture on any camino. The backend determines this by checking for the `owner` role claim in the JWT **only as an override on the ownership check** — the primary guard is still `@Roles('pilgrim')`. A user with only `owner` (no `pilgrim`) cannot delete pictures.
20. Deleting a picture removes both the S3 object and the database record, **in that order**. The service must: (1) load the `CaminoPicture` record, (2) call `UploadsService.deleteImageStrict(url)` — which throws on S3 failure, (3) only on S3 success: delete the DB record. If S3 deletion fails, the database record is not touched and `502 Bad Gateway` is returned. The `502` response body must be a generic message only — internal S3 error details, bucket names, and object keys must not be included. The accommodation pattern (DB first, S3 best-effort) must **not** be used here.
21. When the primary picture is deleted, no other picture is automatically promoted to primary. The primary slot becomes empty and the hero section disappears until a new primary picture is uploaded.
22. When a gallery picture is deleted, the remaining pictures retain their original `position` values. Positions are not recompacted on delete.
23. Deletion is confirmed via an `AlertDialog` prompt before the API call is made. The dialog states the irreversible nature of the action. On confirm, the picture is removed from the UI immediately (optimistic) and reverted if the API call fails.

---

## 4. Data Model

### New table: `camino_pictures`

| Column | Type | Nullable | Constraints | Notes |
|---|---|---|---|---|
| `id` | `UUID` | No | Primary key, default `gen_random_uuid()` | |
| `camino_id` | `UUID` | No | FK → `caminos.id`, `ON DELETE CASCADE` | Deleting the camino removes all its pictures |
| `uploaded_by` | `VARCHAR` | No | | Kinde user ID (not a FK — no local users table) |
| `url` | `TEXT` | No | | Full public S3 URL |
| `is_primary` | `BOOLEAN` | No | Default `false` | |
| `position` | `INTEGER` | Yes | Null when `is_primary = true` | 1-based; `null` for primary picture |
| `created_at` | `TIMESTAMPTZ` | No | Default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | Default `now()`, updated via trigger or Prisma middleware | |

**Indexes / constraints:**
- Unique partial index on `(camino_id) WHERE is_primary = true` — enforces at most one primary picture per camino at the database level.
- Standard index on `(camino_id, position)` for ordered gallery fetches.
- Standard index on `(uploaded_by)` for delete-own queries.

**Prisma model name:** `CaminoPicture`

**Migration name:** `add-camino-pictures`

---

## 5. API Endpoints

### 5.1 Get pictures for a camino

```
GET /api/caminos/:caminoId/pictures
```

- **Auth:** None required (public)
- **Path params:** `caminoId` — UUID; validated with `ParseUUIDPipe`; 400 on non-UUID
- **Implementation note:** The service must verify the camino exists before querying pictures (`prisma.camino.findUnique({ where: { id: caminoId }, select: { id: true } })`). If the camino does not exist, return `404`. Do not return `200` with empty arrays for an unknown camino ID — this masks errors and misleads clients.
- **Success response:** `200 OK`

```json
{
  "primary": {
    "id": "uuid",
    "url": "https://...",
    "uploadedBy": "kinde_user_id",
    "createdAt": "2026-05-28T..."
  } | null,
  "gallery": [
    {
      "id": "uuid",
      "url": "https://...",
      "uploadedBy": "kinde_user_id",
      "position": 1,
      "createdAt": "2026-05-28T..."
    }
  ]
}
```

- **Error cases:**
  - `404 Not Found` — caminoId does not reference an existing camino
  - `400 Bad Request` — caminoId is not a valid UUID

---

### 5.2 Upload a picture

```
POST /api/caminos/:caminoId/pictures
```

- **Auth:** Required — `JwtAuthGuard` + `@Roles('pilgrim')`
- **Content-Type:** `multipart/form-data`
- **Path params:** `caminoId` — UUID
- **Request body (form fields):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | File | Yes | The image binary |
| `isPrimary` | Boolean (string `"true"` / `"false"`) | Yes | Whether to upload as primary |

> **DTO note:** `isPrimary` arrives as a string in multipart. The DTO must use `@Transform(({ value }) => value === 'true')` before `@IsBoolean()`. Do not use `@IsBoolean({ strict: false })` — it coerces `"false"` to `true`. The DTO must **not** contain an `uploadedBy` field; the service always sets `uploadedBy` from `req.user.sub`.

- **Success response:** `201 Created`

```json
{
  "id": "uuid",
  "caminoId": "uuid",
  "url": "https://...",
  "isPrimary": true,
  "position": null,
  "uploadedBy": "kinde_user_id",
  "createdAt": "2026-05-28T..."
}
```

- **Error cases:**
  - `400 Bad Request` — `caminoId` not a UUID, or `isPrimary` missing
  - `404 Not Found` — camino does not exist
  - `409 Conflict` — `isPrimary = true` requested but a primary picture already exists
  - `413 Payload Too Large` — file exceeds 10 MB
  - `415 Unsupported Media Type` — MIME type is not `image/jpeg`, `image/png`, or `image/webp`
  - `401 Unauthorized` — no valid JWT
  - `403 Forbidden` — user does not hold the `pilgrim` role

---

### 5.3 Delete a picture

```
DELETE /api/caminos/:caminoId/pictures/:pictureId
```

- **Auth:** Required — `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('pilgrim')` on the controller method
- **Path params:** `caminoId` — UUID; `pictureId` — UUID (both validated with `ParseUUIDPipe`)
- **Success response:** `204 No Content`
- **Error cases:**
  - `400 Bad Request` — either ID is not a valid UUID
  - `404 Not Found` — no `CaminoPicture` with `id = pictureId` AND `caminoId = caminoId` exists
  - `403 Forbidden` — requester does not hold the `pilgrim` role, OR holds `pilgrim` but is not the uploader AND does not hold the `owner` role
  - `502 Bad Gateway` — S3 deletion failed; database record preserved; response body is generic (no S3 internals)

**IDOR prevention:** The service must look up the picture using both IDs:
```typescript
const picture = await prisma.caminoPicture.findFirst({
  where: { id: pictureId, caminoId },
});
if (!picture) throw new NotFoundException('Picture not found.');
```
Using `findUnique({ where: { id: pictureId } })` alone is insufficient — a pilgrim could delete a picture from any camino by supplying their own camino's ID in the path.

**Authorization logic in service** (runs after `RolesGuard` has already confirmed `pilgrim` role):
```
const userId = req.user.sub;
const userRoles = req.user.roles ?? [];
if (picture.uploadedBy === userId) → allow
if (userRoles.some(r => r.key === 'owner')) → allow
else → throw ForbiddenException
```

---

## 6. UI / UX Spec

### 6.1 Camino detail page layout (revised)

The camino detail page renders sections in this order:
1. Camino name / heading
2. **Main picture** (full-width hero — if `primary` is non-null)
3. Camino description
4. CaminoPoints / Stages list
5. Verification section
6. **Gallery** (if `gallery.length > 0`)
7. Upload controls (visible to authenticated pilgrims only — see 6.3)

### 6.1b Creation and edit form integration

Picture upload is also available inside the camino **creation form** (`/caminos/new`) and the **edit form** (`/caminos/[id]/edit`):

- The form includes the same upload controls described in 6.3 (main picture button + gallery picture button), rendered in a dedicated "Bilder" section of the form.
- During creation, pictures are uploaded immediately on file selection (the camino record is created first before the upload controls become interactive — the form must save the camino draft before enabling uploads, or the form must create the camino on first picture selection if not yet saved).
- **Cancel behaviour on the creation form:** If the user cancels the creation form after having uploaded one or more pictures, the frontend must delete every uploaded picture via `DELETE /api/caminos/:id/pictures/:pictureId` before navigating away. The cancel button shows a loading spinner while deletions are in progress. Navigation is blocked until all deletions complete (success or failure). If any deletion fails, log the error and navigate away regardless — orphaned records are preferable to blocking the user indefinitely.
- On the edit form, cancelling discards only unsaved field edits; already-uploaded pictures are retained (they were already persisted). Only pictures explicitly deleted by the user during the edit session are removed.

### 6.2 Main picture (hero)

- Rendered as a full-width `<img>` (or Next.js `<Image>` with `fill` layout) inside a fixed-aspect-ratio container (16:9).
- `alt` attribute: the camino name (already available from the detail response).
- The image is clickable and opens the lightbox. Since the main picture is not part of the gallery sequence, the lightbox opens with no prev/next controls and shows only this image.
- If `primary` is `null`, this section is not rendered at all — no placeholder, no skeleton, no "add a photo" prompt in this slot.

### 6.3 Upload controls

**Placement:** Below the gallery section (or below the description if the gallery is empty), within a clearly labelled "Add photos" area.

**Visibility:** Rendered only when the user holds the `pilgrim` role (`hasRole('pilgrim')` returns `true`).

**Upload main picture button:**
- Rendered only when `primary === null` (no primary picture exists yet).
- Label: i18n key `camino_detail.pictures.upload_main` (DE: "Hauptbild hinzufügen").
- Opens a native file picker filtered to `image/jpeg,image/png,image/webp`.
- On file selection, calls `POST /api/caminos/:id/pictures` with `isPrimary = "true"`.
- Shows an inline loading spinner on the button while uploading.
- On success: the hero slot appears with the new image; the button disappears.
- On error: an inline error message appears below the button with the specific reason (file too large, wrong type, already exists).

**Upload gallery picture button:**
- Rendered only when the total picture count for the camino is below 50.
- Label: i18n key `camino_detail.pictures.upload_gallery` (DE: "Bild zur Galerie hinzufügen").
- Multiple file selection is NOT supported in this iteration — one file per click.
- On file selection, calls `POST /api/caminos/:id/pictures` with `isPrimary = "false"`.
- Shows an inline loading spinner while uploading.
- On success: the new thumbnail appears at the end of the gallery grid.
- On error: inline error message with the specific reason (including limit-reached for 422).
- When the limit of 50 is reached, both upload buttons are hidden and the limit-reached message is shown instead.

### 6.4 Gallery grid

- Responsive grid: 2 columns on mobile, 3 on tablet, 4 on desktop (Tailwind grid classes).
- Each cell is a fixed-aspect-ratio thumbnail (4:3) using `object-cover`.
- Each thumbnail is wrapped in a `<button>` element for keyboard accessibility. `aria-label`: i18n key `camino_detail.pictures.open_fullscreen` (DE: "Bild im Vollbild öffnen").
- For authenticated pilgrims who uploaded a specific picture, a small delete icon button (`Trash2` from lucide-react) overlays the bottom-right corner of the thumbnail. The delete icon for a picture uploaded by another user is not rendered. Owners see the delete icon on every thumbnail.
- The delete icon button has `aria-label`: i18n key `camino_detail.pictures.delete` (DE: "Bild löschen").
- The main picture is NOT included in the gallery grid — it is displayed separately in the hero slot.

### 6.5 Lightbox (fullscreen viewer)

The lightbox is a full-viewport overlay rendered via a React portal so it sits above all page content. Use an existing shadcn/ui `Dialog` with custom styling, or a dedicated `<Lightbox>` component — the frontend developer chooses the cleanest approach; no third-party lightbox library is to be introduced without architect sign-off.

**Structure:**
- Full-viewport dark overlay (`bg-black/90`).
- Centered image, `max-h-[90vh] max-w-[90vw]`, `object-contain`.
- **Close button:** top-right corner, `X` icon (`X` from lucide-react), `aria-label`: i18n key `camino_detail.pictures.lightbox.close`.
- **Previous button:** left edge of the viewport, `ChevronLeft` icon, hidden when viewing the first gallery image. `aria-label`: i18n key `camino_detail.pictures.lightbox.prev`.
- **Next button:** right edge of the viewport, `ChevronRight` icon, hidden when viewing the last gallery image. `aria-label`: i18n key `camino_detail.pictures.lightbox.next`.
- Prev/next buttons are NOT rendered when the lightbox was opened from the main picture.
- Clicking the dark overlay (outside the image) closes the lightbox.
- Pressing `Escape` closes the lightbox.
- Left arrow key navigates to previous image; right arrow key navigates to next image.
- Current position indicator: `{current} / {total}` rendered below the image (e.g. "2 / 7"), only when in gallery mode.

**Open behaviour:**
- From the main picture: opens the lightbox with the primary picture. No sequence navigation.
- From a gallery thumbnail: opens at the clicked image's index within the ordered gallery array. Enables prev/next.

**Accessibility:**
- When the lightbox opens, focus moves to the close button.
- When the lightbox closes, focus returns to the element that triggered it.
- `role="dialog"`, `aria-modal="true"`, `aria-label`: i18n key `camino_detail.pictures.lightbox.title`.

### 6.6 Delete confirmation dialog

Uses the existing shadcn/ui `AlertDialog` (already added in PILLY-CAM-002).

- Title: i18n key `camino_detail.pictures.delete_confirm.title` (DE: "Bild löschen?")
- Description: i18n key `camino_detail.pictures.delete_confirm.body` (DE: "Dieses Bild wird dauerhaft gelöscht und kann nicht wiederhergestellt werden.")
- Cancel button: i18n key `common.cancel`
- Confirm button: i18n key `common.delete`, destructive variant

On confirm:
- Optimistically remove the picture from the UI.
- Call `DELETE /api/caminos/:id/pictures/:pictureId`.
- On success: nothing further (UI already updated).
- On failure: revert the optimistic removal and display a toast error.

---

## 7. Permission Matrix

| Action | Anonymous | Pilgrim (own upload) | Pilgrim (other's upload) | Owner (pilgrim + owner roles) |
|---|---|---|---|---|
| View main picture | Allowed | Allowed | Allowed | Allowed |
| View gallery | Allowed | Allowed | Allowed | Allowed |
| Open lightbox | Allowed | Allowed | Allowed | Allowed |
| Upload main picture (when none exists) | Denied (401) | Allowed | Allowed | Allowed |
| Upload main picture (when one exists) | Denied (401) | Denied (409) | Denied (409) | Denied (409) |
| Upload gallery picture | Denied (401) | Allowed | Allowed | Allowed |
| Delete own picture | Denied (401) | Allowed | N/A | Allowed |
| Delete another's picture | Denied (401) | Denied (403) | Denied (403) | Allowed |
| See delete icon on thumbnail | No | Own pictures only | Own pictures only | All pictures |

Notes:
- "Pilgrim (own upload)" and "Pilgrim (other's upload)" are the same Kinde role — the distinction is resolved at the service layer by comparing `picture.uploadedBy` with `user.kindeId`.
- The `owner` role column applies to users who hold **both** `pilgrim` and `owner` in Kinde. A user with only `owner` (no `pilgrim`) is treated as anonymous for picture write operations.

---

## 8. Definition of Done

### Backend
- [ ] `CaminoPicture` Prisma model added to `schema.prisma`
- [ ] Migration `add-camino-pictures` created via `yarn prisma:migrate:dev` and committed alongside the schema change
- [ ] Unique partial index `(camino_id) WHERE is_primary = true` added as **hand-written SQL** in the migration file (`CREATE UNIQUE INDEX ... WHERE is_primary = true`) — do NOT use `@@unique([caminoId])` in the Prisma schema, which would create a full unique index and break gallery uploads
- [ ] Gallery query index uses `(camino_id, position ASC, created_at ASC)` to support tie-break sort
- [ ] `CaminoPicturesModule` created under `apps/backend/src/camino-pictures/`
- [ ] `GET /api/caminos/:caminoId/pictures` implemented and publicly accessible; returns `404` (not empty arrays) for non-existent camino
- [ ] `POST /api/caminos/:caminoId/pictures` implemented with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('pilgrim')`, multipart file handling, S3 upload, and all validation rules
- [ ] `DELETE /api/caminos/:caminoId/pictures/:pictureId` implemented with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('pilgrim')`; picture looked up via `findFirst({ where: { id: pictureId, caminoId } })` to prevent IDOR
- [ ] MIME validation is two-layered: `FileTypeValidator` (declared header) + `file-type` magic-byte inspection (actual file bytes); both must pass
- [ ] Upload DTO uses `@Transform(({ value }) => value === 'true')` before `@IsBoolean()` for `isPrimary`; DTO contains no `uploadedBy` field
- [ ] `uploadedBy` is always set from `req.user.sub` in the service, never from the request body
- [ ] `pictureId` UUID is generated in the service before the S3 upload; S3 key is constructed as `camino-pictures/{caminoId}/{pictureId}.{ext}` using only server-generated values — no user-supplied filename
- [ ] `UploadsService` extended with `uploadImage(key: string, file: Express.Multer.File): Promise<string>` (accepts pre-constructed key) and `deleteImageStrict(url: string): Promise<void>` (throws on S3 failure, inspects `response.Errors`)
- [ ] 50-picture count check and insert wrapped in a Prisma transaction to prevent concurrent uploads from exceeding the limit
- [ ] S3 deletion order on picture delete: S3 (`deleteImageStrict`) called first; DB record deleted only on S3 success; `502` response body is generic (no bucket names, keys, or AWS error messages)
- [ ] `deleteImages` (existing method) logs a warning when filtered key count < input URL count (URL prefix mismatch)
- [ ] `CaminosService.delete` updated to fetch all picture URLs, call `UploadsService.deleteImages` (best-effort), then delete the camino
- [ ] Response DTOs use `@Exclude()`/`@Expose()` serialization — no raw Prisma objects
- [ ] Backend unit tests for `CaminoPicturesService`: get pictures, get non-existent camino (404), upload primary (success, conflict), upload gallery, upload with magic-byte/MIME mismatch (415), upload `isPrimary = "false"` string (asserts DB record has `isPrimary === false`), delete own, delete as owner, delete not-own not-owner (403), IDOR attempt via mismatched `caminoId` (404), S3 failure on delete (502, DB record preserved), upload rejected at 50-picture limit (422), `uploadedBy` not overridable from DTO
- [ ] Swagger annotations on all three endpoints (`@ApiConsumes('multipart/form-data')` on upload)

### Frontend
- [ ] `GET /api/caminos/:id/pictures` fetched on the camino detail page via TanStack Query (`useQuery`)
- [ ] `useCaminoPictures` hook created at `apps/frontend/app/api/camino-pictures/use-camino-pictures.ts`
- [ ] `useUploadCaminoPicture` mutation hook created (POST)
- [ ] `useDeleteCaminoPicture` mutation hook created (DELETE), with optimistic update and revert on error
- [ ] Hero section conditionally rendered on the detail page (not rendered when `primary === null`)
- [ ] Gallery section conditionally rendered (not rendered when `gallery.length === 0`)
- [ ] Gallery grid uses responsive Tailwind classes
- [ ] Lightbox component implemented with: fullscreen overlay, close button, keyboard Escape and arrow-key support, prev/next navigation, position indicator, focus management
- [ ] Upload controls (main and gallery) visible only to pilgrims; upload main button hidden when primary exists; both buttons hidden when total picture count ≥ 50
- [ ] Upload controls present in the creation form and edit form, not only on the detail page
- [ ] Creation form cancel handler deletes all uploaded pictures before navigating away; cancel button shows loading state during cleanup
- [ ] Delete icon overlay on gallery thumbnails with correct visibility rules (own pictures only / all for owners)
- [ ] Delete confirmation `AlertDialog` implemented
- [ ] All user-facing strings use i18n keys (no hardcoded strings)
- [ ] All new i18n keys added to `messages/de.json` and `messages/en.json`
- [ ] No `console.log` in production code paths
- [ ] `<img>` elements use Next.js `<Image>` component with explicit `width`/`height` or `fill` prop

### Testing
- [ ] E2E spec `camino-pictures.spec.ts` opens with `test.describe.configure({ mode: 'serial' })` and `test.setTimeout(60_000)`; `beforeAll`/`afterAll` hooks that perform login call `testInfo.setTimeout(120_000)` as their first line
- [ ] E2E spec `camino-pictures.spec.ts` covers:
  - Visitor can view main picture and gallery on a seeded camino (read-only, no login)
  - Visitor can open lightbox and navigate with prev/next
  - Pilgrim can upload a gallery picture; thumbnail appears in grid
  - Pilgrim can upload a main picture when none exists; hero slot appears
  - Pilgrim upload of main picture when one already exists shows error state
  - Pilgrim can delete own picture; thumbnail disappears after confirmation
  - Pilgrim cannot see delete icon on another user's picture
  - Owner can delete a picture uploaded by another user
  - Pilgrim uploads 50 pictures; 51st upload is rejected and upload controls disappear
  - Cancelling the creation form after uploading pictures removes the pictures from the bucket
- [ ] Unit tests additionally cover:
  - `isPrimary = "false"` string from multipart: asserts stored record has `isPrimary === false`
  - Magic-byte / MIME mismatch: submit a non-image file with `Content-Type: image/jpeg`; assert `415`
  - IDOR attempt: `DELETE /caminos/<camino-A-id>/pictures/<camino-B-picture-id>` returns `404`
  - `uploadedBy` field in request body is ignored; stored value equals caller's JWT subject
  - GET with non-existent `caminoId` returns `404`, not `200` with empty arrays
  - S3 delete failure returns `502` and DB record is still present
  - Owner-only user (no `pilgrim` role) is blocked at guard layer with `403`
  - Pilgrim cannot delete another pilgrim's picture: `403` from service ownership check
  - Two concurrent uploads at count=49: exactly one succeeds, one gets `422`
  - Gallery pictures with equal `position` are sorted by `created_at` ascending

### Cross-cutting
- [ ] Camino delete handler (`DELETE /api/caminos/:id`) fetches all picture URLs, deletes the S3 objects via `UploadsService` (best-effort), then deletes the camino (DB cascade removes `camino_pictures` rows) — verified in a unit test
- [ ] Backend unit test: upload rejected with 422 when camino already has 50 pictures
- [ ] The detail page Lighthouse score for LCP (main picture candidate) does not regress below the pre-feature baseline
- [ ] Deployed to staging and acceptance criteria verified by PO

---

## 9. Edge Cases and Constraints

### File constraints
- **Maximum size:** 10 MB. Enforce with NestJS `ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })] })`. Error response: `413 Payload Too Large` with body `{ "message": "File exceeds the maximum size of 10 MB" }`.
- **Accepted MIME types:** `image/jpeg`, `image/png`, `image/webp`. Enforce with two layers: (1) `FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ })` on the declared header; (2) magic-byte inspection inside the service using `file-type`:
  ```typescript
  import { fileTypeFromBuffer } from 'file-type';
  const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    throw new UnsupportedMediaTypeException(
      'File type not supported. Accepted types: image/jpeg, image/png, image/webp',
    );
  }
  ```
  Both checks must pass. Relying only on the `Content-Type` header allows MIME spoofing (renaming any file and declaring a valid image type).

### Primary picture deletion behaviour
When the primary picture is deleted, no automatic promotion occurs. The `primary` field in the GET response becomes `null`. The hero section disappears from the detail page. Any pilgrim may then upload a new primary picture. There is no concept of "demoting" a gallery picture to primary; only a fresh upload can fill the primary slot.

### Concurrent upload race for primary picture
Two pilgrims may simultaneously attempt to upload a primary picture for a camino that currently has none. The database unique partial index on `(camino_id) WHERE is_primary = true` is the authoritative guard. Whichever request commits the transaction first wins. The second request receives a `409 Conflict` response with body `{ "message": "A primary picture already exists for this camino" }`. The S3 object uploaded by the losing request is deleted immediately (best-effort) to avoid orphaned files. If S3 cleanup of the losing upload fails, log the orphaned URL for manual cleanup; do not surface this failure to the user.

### Empty gallery state
If a camino has gallery pictures and the last one is deleted, the gallery section disappears from the page (FR-12). No empty-state UI is shown. The upload gallery button remains visible to pilgrims.

### S3 object key format
S3 keys follow the pattern `camino-pictures/{caminoId}/{pictureId}.{ext}`. The `ext` is derived from the **validated** MIME type map (not from the user-supplied filename):
```typescript
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp',
};
const ext = EXT_MAP[detectedMime]; // guaranteed safe after magic-byte check
const key = `camino-pictures/${caminoId}/${pictureId}.${ext}`;
```
The `pictureId` UUID is generated with `randomUUID()` in the service **before** the S3 upload so that the DB insert and the S3 key are consistent. The user-supplied original filename must never appear in the S3 key — doing so leaks local file paths in public URLs and risks double-extension attacks. The existing `UploadsService.uploadImages()` method appends the original filename and must NOT be called from `CaminoPicturesService`; use the new `uploadImage(key, file)` method instead.

### Error information leakage
`502 Bad Gateway` responses for S3 failures must contain only a generic message: `{ "message": "Failed to delete the image from storage. The record has been preserved." }`. S3 error codes, AWS error messages, bucket names, and object keys must be logged server-side only and must never appear in API responses.

### Camino deletion cascade
`ON DELETE CASCADE` on `camino_pictures.camino_id` removes all `CaminoPicture` rows when a camino is deleted. The camino delete handler must also delete all associated S3 objects **before** triggering the DB delete. The sequence: (1) fetch all `url` values for the camino's pictures, (2) call `UploadsService.deleteImages(urls)` — best-effort, log failures, do not abort, (3) delete the camino record (DB cascade cleans up `camino_pictures` rows). This mirrors the existing accommodation delete pattern.

### Position gaps after deletion
Gallery picture positions are not recompacted after a delete. If positions `[1, 2, 3]` exist and position 2 is deleted, positions `[1, 3]` remain. The frontend must not assume contiguous positions — it must sort by `position` ascending and use array index for display order, not the `position` value itself.

### Main picture in lightbox
The main picture is not included in the gallery sequence. Opening the lightbox from the main picture shows only that image; the prev/next controls are not rendered; the position indicator is not rendered. If the user also wants to view gallery pictures, they must close the lightbox and click a gallery thumbnail.

### Upload during concurrent gallery position assignment
If two pilgrims upload gallery pictures simultaneously, both compute `max(position) + 1`. A race condition may result in two pictures sharing the same position value. This is acceptable in V1 — the display order degrades to consistent (sort is deterministic: secondary sort on `created_at` ascending when positions are equal) but not strictly sequential. A `UNIQUE` constraint on `(camino_id, position)` is explicitly NOT added in this iteration to avoid upload failures for normal concurrent use.

---

## 10. Open Questions

1. ~~**S3 bucket and credentials:**~~ **RESOLVED** — Storage is **Supabase Storage** (S3-compatible API). The existing bucket (`$SUPABASE_STORAGE_BUCKET`) and credentials (`$SUPABASE_S3_URL`, `$SUPABASE_S3_REGION`, `$SUPABASE_S3_ACCESS_KEY_ID`, `$SUPABASE_S3_SECRET_ACCESS_KEY`) are already configured and used by accommodation image uploads. No new bucket or credentials are needed.
2. ~~**Image CDN / resizing:**~~ **RESOLVED** — Images are served directly from Supabase Storage's public URL: `{SUPABASE_URL}/storage/v1/object/public/{bucket}/{key}`. No CDN or proxy is used. The Next.js `<Image>` domain allow-list already includes the Supabase hostname (used for accommodation images); verify this covers camino pictures too.
3. ~~**Aspect ratio for hero container:**~~ **RESOLVED** — 16:9.
4. ~~**Thumbnail aspect ratio for gallery grid:**~~ **RESOLVED** — 4:3.
5. ~~**Maximum gallery picture count:**~~ **RESOLVED** — Hard backend limit of **50 pictures per camino** (primary + gallery combined). The backend rejects uploads that would exceed this limit with `422 Unprocessable Entity` and body `{ "message": "This camino has reached the maximum of 50 pictures." }`. The frontend shows an inline error when this limit is hit and hides the upload controls once the limit is reached.
6. ~~**S3 cleanup on camino delete:**~~ **RESOLVED** — The camino delete handler must fetch all `CaminoPicture` URLs for the camino, delete the S3 objects via `UploadsService`, and then delete the camino (which cascades the DB rows). S3 cleanup runs before the DB delete. If S3 cleanup fails partially, log the orphaned keys and proceed with the DB delete (best-effort, same pattern as accommodation deletion).
7. ~~**Main picture upload from the creation form:**~~ **RESOLVED** — Picture upload is integrated into both the **creation form** (`/caminos/new`) and the **edit form**. When the creation form is **cancelled** after one or more pictures have been uploaded, the frontend must call `DELETE /api/caminos/:id/pictures/:pictureId` for every uploaded picture (or a batch endpoint if one exists) to remove the orphaned S3 objects and DB records before navigating away. The cancel handler must complete all deletions before the navigation occurs (show a loading state on the cancel button if needed).

---

## Dependencies

- **PILLY-CAM-002** (camino detail page) — this ticket adds sections to the detail page established by PILLY-CAM-002. The detail page route `/caminos/[camino_id]` must already exist.
- **Existing `UploadsModule`** (`apps/backend/src/uploads/`) — import into `CaminoPicturesModule`. Two new methods must be added to `UploadsService` as part of this ticket:
  - `uploadImage(key: string, file: Express.Multer.File): Promise<string>` — accepts a pre-constructed S3 key, uploads the file, returns the public URL. Used by `CaminoPicturesService` so the key format is fully controlled.
  - `deleteImageStrict(url: string): Promise<void>` — deletes a single S3 object and throws `BadGatewayException` if the key appears in `response.Errors` or the SDK call rejects. Used for picture delete where S3 failure must block the DB delete.
  The existing `uploadImages` and `deleteImages` methods remain unchanged for accommodation callers.
- **Existing `AlertDialog` shadcn component** — already added in PILLY-CAM-002; no re-install needed.
- **Kinde JWT claim shape** — the backend must be able to extract both `pilgrim` and `owner` role claims from the same JWT to implement the owner-override delete logic. The existing `RolesGuard` reads Kinde roles; confirm it exposes multiple roles simultaneously for service-layer checks.
