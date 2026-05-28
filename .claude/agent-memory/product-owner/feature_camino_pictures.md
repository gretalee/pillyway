---
name: "Camino pictures feature decisions"
description: "Key product decisions for PILLY-CAM-003: CaminoPicture entity, primary vs. gallery split, S3 upload via backend, owner-override delete logic, lightbox UX, and open questions"
metadata:
  type: project
---

Ticket PILLY-CAM-003 adds main picture and gallery picture support to the Camino detail page. See `.claude/tickets/PILLY-CAM-003-camino-pictures.md` for the full specification.

**Why:** Pictures are the primary visual signal for a camino. Without them the detail page is text-only. This is a high-priority feature for user engagement.

**How to apply:** Reference these decisions in any ticket that touches camino media, S3 storage, lightbox UX, or the camino detail page layout.

## Data model

`CaminoPicture` table (`camino_pictures`): `id`, `camino_id` (FK cascade), `uploaded_by` (Kinde user ID string — no FK), `url` (TEXT), `is_primary` (BOOLEAN default false), `position` (INTEGER nullable — null when is_primary), `created_at`, `updated_at`.

Key constraints:
- Unique partial index on `(camino_id) WHERE is_primary = true` — enforces one primary per camino at DB level.
- `camino_id` has `ON DELETE CASCADE` — camino deletion removes all picture rows (but NOT S3 objects — acknowledged V1 limitation).
- No `UNIQUE` on `(camino_id, position)` — intentionally omitted to avoid concurrent upload failures.
- Primary picture has `position = null`; gallery pictures have `position >= 1`.

Migration name: `add-camino-pictures`

## Permission model (resolved)

- `@Roles('pilgrim')` guard on upload and delete endpoints — same pattern as all other write operations.
- Delete ownership check at service layer:
  - `picture.uploadedBy === user.kindeId` → allow
  - `user.hasRole('owner')` (in addition to pilgrim) → allow
  - Otherwise → 403
- A user with only the `owner` role (no `pilgrim`) cannot write pictures — same rule as all content operations.

## API surface

- `GET /api/caminos/:caminoId/pictures` — public; returns `{ primary: CaminoPicture | null, gallery: CaminoPicture[] }`.
- `POST /api/caminos/:caminoId/pictures` — pilgrim; multipart; `file` + `isPrimary` fields; 409 if primary already exists and `isPrimary = true`.
- `DELETE /api/caminos/:caminoId/pictures/:pictureId` — pilgrim; 204; S3 deleted first; 502 if S3 fails; no DB delete if S3 fails.

File constraints: max 10 MB, MIME types: `image/jpeg`, `image/png`, `image/webp` only.

S3 key pattern: `camino-pictures/{caminoId}/{pictureId}.{ext}`

## Page layout

Camino detail page section order (PILLY-CAM-003 additions):
1. Heading
2. Main picture hero (16:9, skipped if no primary)
3. Description
4. Stages list
5. Verification section
6. Gallery grid (skipped if empty; 2/3/4 columns mobile/tablet/desktop)
7. Upload controls (pilgrim only)

## Lightbox

- Main picture opens in lightbox without prev/next (not part of gallery sequence).
- Gallery thumbnail opens lightbox at clicked index; prev/next + `{n}/{total}` indicator.
- Keyboard: Escape to close, left/right arrows to navigate.
- Focus management: focus moves to close button on open; returns to trigger on close.
- No third-party lightbox library without architect sign-off.

## Race condition / edge cases (resolved)

- Primary upload race: DB unique partial index wins; losing request gets 409; its S3 object is cleaned up best-effort.
- Primary deletion: no auto-promotion of gallery pictures; hero slot just disappears.
- Gallery position gaps after delete: acceptable in V1; secondary sort on `created_at` for ties.
- S3 cleanup on camino delete: NOT handled in this ticket (V1 limitation); deferred to future maintenance.

## Open questions (at ticket write time)

1. S3 bucket name/region — does one already exist for user uploads?
2. CDN/image resizing proxy (affects URL stored in DB and Next.js domain allowlist).
3. Hero aspect ratio (16:9 proposed, designer to confirm).
4. Gallery thumbnail aspect ratio (1:1 vs. 4:3, designer to confirm).
5. Hard max on gallery picture count per camino?
6. S3 cleanup on camino delete — extend PILLY-CAM-002 handler or separate ticket?
7. Main picture upload at creation time (`/caminos/new`) — deferred to post-creation in this ticket; confirm with stakeholder.

See [[feature_camino_update_delete]] for the detail page established by PILLY-CAM-002 that this ticket extends.
