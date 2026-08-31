---
name: pattern-image-derivative-urls
description: Decision on how to represent thumbnail + gallery image derivatives across CaminoPicture, Accommodation, Sight without schema/frontend churn
metadata:
  type: project
---

Decision (2026-08): store exactly one URL per image everywhere, unchanged shape
(`CaminoPicture.url` stays a single string; `Accommodation.imageUrls` /
`Sight.imageUrls` stay `String[]`). That stored URL is the "gallery" size.
The "thumbnail" size is never stored — it's derived by a naming-convention
transform, applied uniformly to all three image types (not just
Accommodation/Sight): backend writes both objects at upload time using a
fixed suffix on the server-generated key (`{key}.webp` gallery,
`{key}-thumb.webp` thumbnail); a single pure function
`deriveThumbnailUrl(url): string` (strip `.webp`, append `-thumb.webp`) is
the only place the convention lives, used by the frontend at display time
and by the backend at delete time.

**Why:** rejected the "add explicit schema columns / structured JSON"
alternative because it requires a migration on `Accommodation`/`Sight`
(currently flat `String[]` arrays read by dozens of frontend call sites as
"one URL = one image") and touching all those call sites — out of scope for
the PR that only wants the *foundation* laid (frontend wiring to actually
pick between sizes is an explicit follow-up). Naming-convention derivation
gets the same eventual capability with zero migration and zero required
frontend changes now, and doesn't foreclose adding an explicit column later
if the thumbnail URL ever needs to be independently queryable — that would
be an additive, backward-compatible column at that point.

**Known gap to close in the same PR (not deferrable):** `UploadsService.deleteImages()`
and `deleteImageStrict()` (`apps/backend/src/uploads/uploads.service.ts`)
only delete the key(s) derived from URLs actually stored in the DB — i.e.
only the gallery key, under this scheme. Every delete path (camino picture
delete, accommodation/sight image removal) must also compute + delete the
derived thumbnail key via the same shared function, or every image deletion
leaks one orphaned S3 object permanently. This must ship in the same change
that introduces dual-derivative uploads, not left for the frontend-wiring
follow-up.

**Known gap for a near-term follow-up (not this PR, but must not be forgotten):**
legacy images uploaded before this pipeline (all current `Accommodation`/
`Sight`/`CaminoPicture` URLs) have no `-thumb.webp` sibling in S3 —
`deriveThumbnailUrl()` will 404 for them. Needs either a backfill script
(pattern: `apps/backend/scripts/backfill-camino-countries.ts`) that
reprocesses existing images through the new `ImageProcessingService`, or an
`onError` fallback-to-full-URL in whatever frontend component first
consumes `deriveThumbnailUrl()`.

**How to apply:** if asked to review or extend the image upload/processing
work (`apps/backend/src/uploads/`, `apps/backend/src/camino-pictures/`),
check that new code follows this single derivation convention rather than
reintroducing a schema-based thumbnail column for one model only — mixing
strategies across the three image types was explicitly rejected for
consistency with the shared `ImageProcessingService`.
