---
name: camino-pictures-feature-pilly-cam-003
description: Security risks, authorization gaps, and QA anchors for the PILLY-CAM-003 camino pictures feature (upload, gallery, lightbox, delete)
metadata:
  type: project
---

PILLY-CAM-003 adds per-camino image upload (primary + gallery), a lightbox viewer, and role-gated deletion. Ticket reviewed pre-implementation on 2026-05-28.

**Why:** File upload is the highest-risk surface in the codebase. Compound risks: MIME spoofing, S3 key construction, caminoId ownership bypass, orphaned objects, and a two-role delete rule that diverges from all prior delete patterns.

**How to apply:** At implementation review, verify every item in the blocker and major findings list below. Pay special attention to magic-byte validation and the `isPrimary` boolean coercion from multipart strings.

## Critical risks flagged (pre-implementation)

1. **MIME spoofing (blocker)** — `FileTypeValidator({ fileType: /.../ })` checks the browser-supplied Content-Type header in the `mimetype` field, not the actual file bytes. The existing `uploads.controller.ts` uses the same pattern (mimetype string check only). A renamed `.php` file submitted with `Content-Type: image/jpeg` passes all declared validators. Require magic-byte inspection via `file-type` npm package before passing the buffer to S3.

2. **`isPrimary` boolean coercion (major)** — Multipart string `"false"` is truthy in JavaScript. If the DTO uses `@IsBoolean()` without a `@Transform()` to parse the string, all uploads silently become primary uploads. Must use `@Transform(({ value }) => value === 'true')` before `@IsBoolean()`.

3. **S3 key injection (major)** — Ticket spec shows keys as `camino-pictures/{caminoId}/{pictureId}.{ext}`. Both UUIDs are generated server-side (safe). The `ext` must be derived from the validated MIME type map (`image/jpeg → jpeg` etc.), never from the original filename or user-supplied extension. Existing `uploadImages` in `UploadsService` appends the sanitised original filename to the key — the new service must NOT use this pattern; it must construct the key purely from server-generated values.

4. **`uploadedBy` source (major)** — Must come from `req.user.sub` in the controller/service, never from a DTO field. A DTO field named `uploadedBy` is a direct mass-assignment hole allowing IDOR bypass.

5. **Delete authorization divergence from `DeleteAuthorizationService` (major)** — The new delete rule ("pilgrim who uploaded it, or any owner") differs from the existing window-based service. Do NOT reuse `DeleteAuthorizationService` for pictures — it enforces a time window and uses `createdBy` vs `uploadedBy`. The picture service must implement its own check: `picture.uploadedBy === userId || roles.some(r => r.key === 'owner')`. Additionally, the guard on DELETE must check `@Roles('pilgrim')` — a user with only `owner` (no `pilgrim`) must be blocked at the guard layer, not the service.

6. **S3 key extraction from URL in deleteImages (minor-to-major)** — `deleteImages` strips the `publicBaseUrl` prefix to derive the S3 key. If the URL stored in the DB was tampered or constructed differently, the key extraction silently produces no keys and deletes nothing. The service correctly guards with `.filter(url => url.startsWith(prefix))` — verify this guard is in place and tested for the camino-pictures deletion path.

7. **No per-user upload rate limit (minor)** — The 50-picture-per-camino cap is enforced in DB, but a single pilgrim can exhaust the quota alone. No per-user or per-session rate limit is specified or implemented. Acceptable for V1; flag for Phase 2.

8. **Orphaned S3 on creation-form cancel (minor)** — Cancel cleanup is frontend-only (calls DELETE per picture). If the tab is closed, objects remain. DB cascade removes the `camino_pictures` rows if the camino is deleted, but S3 objects are permanent unless the camino delete handler runs. For orphan cleanup, an async S3 audit job is the long-term fix; acceptable for V1 if logged.

9. **caminoId not verified against picture (minor)** — DELETE `/caminos/:caminoId/pictures/:pictureId` — must verify `picture.caminoId === caminoId` to prevent cross-camino deletion via ID substitution. Fetch the picture and compare.

10. **Error information leakage (minor)** — `InternalServerErrorException` message in `UploadsService` includes `file.originalname`. On the new S3 502 path, the error message must not include S3 bucket name, key, or credentials. Use a generic message in the 502 body; log details server-side only.

11. **`SUPABASE_URL` absent at build time (minor)** — `next.config.ts` reads `process.env.SUPABASE_URL` at module load. If the env var is absent in a CI build, `getSupabaseStoragePattern()` returns `null` and `<Image>` has no valid Supabase remote pattern, which silently breaks image rendering in production. Add a build-time check that warns loudly if the value is missing.

## Test anchors to verify at implementation review
- Unit test: `isPrimary = "false"` string from multipart coerces to `false` boolean (not `true`)
- Unit test: `isPrimary = "true"` string coerces to `true`
- Unit test: delete with `uploadedBy !== userId && !owner` → 403
- Unit test: delete with `uploadedBy === userId && !pilgrim` → 403 (guard blocks before service)
- Unit test: upload when picture count = 50 → 422
- Unit test: magic-byte mismatch with correct Content-Type → 415
- Unit test: `picture.caminoId !== :caminoId` path param → 404 or 403
- E2E: pilgrim cannot see delete icon on another user's picture
- E2E: 50-picture limit hides upload controls
- E2E: cancel creation form after upload → pictures gone from bucket (verify via GET pictures returning empty)

## Related memories
- [[camino-creation-update-delete-pilly-cam-001-002]] — prior delete auth patterns and guard order rule
- [[pillyway-domain-model]] — role matrix and CORS status
