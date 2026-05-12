---
name: Pillyway Stage feature patterns
description: Patterns established in the Stage feature (PILLY-STG-001): shared entity display, pre-save confirmation dialogs, and client-side reorder detection
type: project
---

Stage entities are globally shared by `(startPointId, endPointId)` — editing a stage from one Camino updates it everywhere. No ownership check needed; role check only.

## API hook patterns (from this feature)

- `use-stages.ts` — `useStages(caminoId)` — `GET /api/caminos/:id/stages`, public, query key `['stages', caminoId]`
- `use-stage.ts` — `useStage(caminoId, stageNumber)` — `GET /api/caminos/:id/stages/:n`, public, query key `['stage', caminoId, stageNumber]`
- `use-update-stage.ts` — `useUpdateStage()` — `PATCH /api/caminos/:id/stages/:n`, auth required. Hook-level `onSuccess` invalidates both `['stage', caminoId, stageNumber]` and `['stages', caminoId]`. Form-level `onSuccess` handles navigation.

## Pre-save confirmation dialog pattern

When a mutation has side-effects that the user should understand before proceeding:
1. In `onSubmit`, compute whether the condition is met (departing pairs with data).
2. If met: set `pendingPayload` state + count state. Return early (do NOT call `mutation.mutate`).
3. Render `<AlertDialog open={pendingPayload !== null} onOpenChange={...}>` outside the form, inside a Fragment.
4. Confirm button calls `executeMutation(pendingPayload)`, then clears `pendingPayload`.
5. Cancel button clears `pendingPayload`.
6. Graceful degradation: if dependent data is unavailable (loading/error), skip the check and submit immediately.

## Reorder detection logic (UpdateCaminoForm)

1. Fetch current stages via `useStages(caminoId)` (added to the form).
2. From form's `caminoPoints`, extract consecutive `caminoPointId` pairs (null IDs filtered out).
3. Build a Set of `startId:endId` keys for O(1) lookup.
4. A stage is "departing" if its `startPoint.id:endPoint.id` key is NOT in the new set AND `distance !== null || description !== null`.
5. If any departing stages have data → show dialog. Otherwise → submit immediately.

## AccessDenied component

Updated to accept optional `message?: string` prop. When provided, renders the given message. When omitted, falls back to `caminos_new.access_denied` translation key. Pattern for role-gated pages that want to provide context-specific error messages.

**Why:** Stage edit page needed a different message from the camino new page.
**How to apply:** When rendering `<AccessDenied>` on a new auth-gated page, pass `message={t('access_denied')}` from the page's own namespace.
