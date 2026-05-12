# Architecture Review — PILLY-STG-001: Introduce Stage Entity

**Reviewer:** Software Architect Lead
**Reviewed:** 2026-05-11
**Ticket:** `/Users/hendrike/Documents/projects/PillyWay/DEV/pillyway/.claude/tickets/feature-stages.md`
**Branch target:** `feature/stages` → `main`

---

## Summary

The ticket is well-structured and reflects genuine thinking about the domain (shared stage reuse,
global identity by point pair, separation between structural ordering and enrichment data). Most
of the design is sound. There are two blockers and several concerns that need resolution before
or during implementation. Nothing here is a reason to halt the ticket — the blockers are
addressable in minutes once identified.

---

## 1. Schema & Migration

**Verdict: ⚠️ Concern (one near-blocker on `updatedAt`)**

The `Stage` model shape is correct. The `@@unique([startPointId, endPointId])` constraint
correctly enforces the shared-stage invariant at the database level, and the nullable `distance`
/ `description` fields match the domain intent.

**Missing `@updatedAt` or explicit trigger — near-blocker.** The ticket notes that `updatedAt`
must be set on every write and instructs the developer to pass `updatedAt: new Date()` explicitly
because `@updatedAt` is not used. However, the schema as written uses `@default(now())` on
`updatedAt` but has no `@updatedAt` attribute and no DB trigger. This means a `prisma.stage.upsert`
with an empty `update: {}` block (the no-op path for already-existing rows) will silently leave
`updatedAt` unchanged — correct behaviour on upsert. But a PATCH that omits `updatedAt` from the
`data` object will also leave it unchanged with no compile-time warning. The ticket calls this out
in prose but does not add it to the DTO or to a central update helper. The developer must remember
to include it in every `prisma.stage.update` call manually. **Recommendation:** add `@updatedAt`
to the schema field so Prisma handles it automatically, consistent with the `Camino` model
convention already in place (or at minimum add a lint comment in the migration file so it is
reviewed at migration time).

**No index on `(startPointId, endPointId)` beyond the unique constraint.** The unique index on
`(startPointId, endPointId)` doubles as a lookup index, which is fine for exact-pair lookups in
`findUnique`. For the batch `findMany` in `findByCamino` (which filters using an `IN`-style
expression across pairs), PostgreSQL can use the composite index if the query is written as an
`OR`-expanded filter or via an `ANY` array match — but this depends heavily on how Prisma
generates the query. Verify the generated SQL in development; if Prisma emits a sequential scan
for the batch path, a dedicated index `(startPointId)` may help. Low risk at current data
volumes, but worth noting before the feature goes to production with large caminos.

---

## 2. Eager Creation in `CaminosService`

**Verdict: ⚠️ Concern (structural fit) — not a blocker, but requires deliberate implementation**

The existing `create()` and `update()` methods are both wrapped in `prisma.$transaction(async tx
=> { ... })`. The ticket specifies that `upsertStagePairs` is implemented in `StagesService` and
calls `prisma.$transaction([...])` (interactive vs. batch transaction syntax). **This is the
concern:** you cannot nest Prisma interactive transactions. If `upsertStagePairs` opens its own
`prisma.$transaction`, calling it from inside the existing `CaminosService` transaction will
either (a) open a second independent transaction — breaking atomicity with the camino write — or
(b) throw a Prisma error depending on the connection pool configuration.

The correct pattern is one of:
- Pass the transaction client `tx` into `upsertStagePairs` so it executes within the same
  transaction: `await stagesService.upsertStagePairs(pointIds, tx)`.
- Or keep `upsertStagePairs` entirely inside `CaminosService` as a private helper that accepts
  `tx`, and remove it from `StagesService` (which handles reads and PATCH only).

The ticket's API (`upsertStagePairs(pointIds: string[]): Promise<void>`) does not accept a
transaction client. If implemented as written, the stage upserts will run outside the camino
transaction, leaving a window where a failed camino write could leave orphaned stage rows or a
failed stage upsert could leave a camino with no stage rows. **This must be resolved before
implementation starts.**

The `update()` method also calls `this.findById(id)` outside the transaction as its final step
(line 410 in `caminos.service.ts`). This is fine for the current code but worth noting: any stage
upserts that need to be reflected in the `findById` result will be visible because they run
before `findById` is called, assuming the fix above is applied.

---

## 3. API Design

**Verdict: ⚠️ Concern (consistency risk on `stageNumber` URL param)**

Resolving `stageNumber` by re-querying `camino_point_order` on every request is the right
approach given that stages have no stored `position` column of their own. The batch query
approach for `findByCamino` is sound, provided the implementation does not fall into N+1
territory (addressed in the ticket's implementation notes).

**The consistency risk is subtle:** `stageNumber` is a derived, position-based identifier. If the
same camino's point order is modified concurrently by two pilgrims (unlikely but possible),
stageNumber N in a GET response may refer to a different physical stage pair by the time a
subsequent PATCH arrives. This is acceptable given the application's current scale and the fact
that `(startPointId, endPointId)` is the actual identity — but it means a client that retains a
stageNumber across a concurrent edit window may PATCH the wrong stage. At this stage of the
product the risk is theoretical; document it as a known limitation so it is not forgotten.

**`GET /api/caminos/:caminoId/stages` notes a null-id case for stages not yet in the DB, but
section 3.2 says eager creation guarantees rows always exist.** There is a direct contradiction
in the ticket: section 3.1 implementation note 4 says `id: null` can appear when a stage row
does not exist; section 3.2 and the "Resolved Decisions" section 7 say eager creation ensures
rows always exist and `id` is always a UUID. The frontend type `StageListItem` declares `id:
string` (non-nullable), consistent with eager creation. The backend implementation must not
return `id: null`; the section 3.1 note is a remnant of the earlier lazy-creation design and
should be removed or corrected to avoid developer confusion. **This is a documentation blocker.**

---

## 4. Reorder-Warning Client-Side Detection

**Verdict: ✅ Sound — with one edge case to handle**

Placing the detection logic in `UpdateCaminoForm` is the correct layer. The form already holds
both the loaded stage list (via `useStages`) and the current form state, so no new API round-trip
is required. The comparison logic (current pairs minus new pairs = departing pairs; filter by
`distance !== null || description !== null`) is straightforward and correct.

**One edge case: the form does not yet call `useStages`.** Looking at the current
`UpdateCaminoForm.tsx`, it calls `useCamino(caminoId)` and `useUpdateCamino()` but has no
`useStages` call. The ticket instructs the developer to add `useStages(caminoId)` to the form,
which is the right call. The developer must be aware that this adds a second network request to
the update form's load sequence. If `useStages` returns an error or is still loading when the
user clicks submit, the detection logic must degrade gracefully — either assume no enriched pairs
(safe, no false-positive dialog) or block the submit until stages are loaded. The ticket does not
specify this degraded path. **Recommendation:** if `useStages` is loading or errored, treat
departing pairs as unenriched (no dialog) and log a warning. Do not block the save.

**Detection correctness:** Comparing by `(startPointId, endPointId)` string pairs is exact and
correct. The form already stores `caminoPointId` per item so constructing new pairs from
`watchedPoints` is straightforward. No concern here.

---

## 5. `createdAt` / `updatedAt` and Orphan Cleanup Heuristic

**Verdict: ⚠️ Concern (heuristic is fragile)**

The proposed cleanup heuristic — "orphaned AND `updatedAt === createdAt`" — has a meaningful
false-negative case. If a stage is enriched (PATCH sets `distance = 24.7`) and then cleared
(PATCH sets `distance = null, description = null`) the row has `updatedAt > createdAt` but
carries no data. It will never be flagged as safe to delete by the heuristic, even though it is
functionally empty. This is not a current problem (orphan cleanup is explicitly out of scope) but
the heuristic as documented will accrue permanent exceptions over time as pilgrims edit and
clear fields.

A more robust signal would be a boolean `enriched` flag or a dedicated `lastEnrichedAt` column.
That is scope creep for V1, but the ticket should acknowledge the limitation explicitly rather
than presenting the heuristic as reliable. **No action required now; add a code comment in the
migration file noting this limitation.**

The lack of a cascade delete on the `CaminoPoint → Stage` foreign key is correct and intentional
(stages are globally shared). The default PostgreSQL `RESTRICT` behaviour is safe — it will
surface an error if a CaminoPoint deletion is ever attempted while stage rows reference it,
prompting proper cleanup. This is better than silent cascade deletes.

---

## 6. Frontend Architecture — SSR vs Client-Side `StageList`

**Verdict: ❌ Blocker — contradicts the ticket's own SSR requirement**

The ticket specifies in section 4.2 that `StageList` is a client component calling `useStages`
(TanStack Query). Section 4.3 specifies that the stage detail page's `page.tsx` is a server
component that renders `<StageDetail caminoId={...} stageNumber={...} />` which is a client
component calling `useStage`. Taken individually these are consistent with the existing pattern
for `CaminoDetail`.

The blocker is in the Camino detail flow. `CaminoDetail.tsx` (the parent of `StageList`) is
currently a client component (it uses hooks). The ticket replaces the waypoints section with
`<StageList caminoId={caminoId} />`. The page at `/caminos/[camino_id]/page.tsx` is a server
component, so this nesting is:

```
page.tsx (server) → CaminoDetail (client) → StageList (client)
```

This is valid Next.js App Router composition — a client component can render other client
components. The `StageList` data will load client-side after hydration; it will NOT be
server-rendered. The ticket's Context & Background section says "public pages are SSR" but the
current `CaminoDetail` architecture is already client-rendered (the detail page fetches via
`useCamino`). So this is not a regression; it is consistent with the existing pattern.

**However**, the ticket contradicts itself: the Use Case section UC-1 step 2 says "The page calls
`GET /api/caminos/:caminoId/stages`" which implies a server-side fetch, but the implementation
spec calls for `useStages` (client-side TanStack Query). Developers reading the UC description
may implement it as a server component data fetch, conflicting with the hook-based approach
specified in section 4.5. **The ticket must clarify that the stage list is fetched client-side
via `useStages`, consistent with the rest of the Camino detail page's data-loading pattern.**

A further consequence: the stage list will be absent from the initial HTML payload (no SSR
content, no SEO for stage names). If stage names are considered SEO-relevant, the architecture
should shift `CaminoDetail` and `StageList` to server components with async data fetching. This
is a product decision, not a blocker for the current ticket, but it should be a conscious choice,
not an accidental omission.

---

## 7. Missing or Under-Specified Items

**Verdict: ⚠️ Several gaps that would slow a developer down**

**7a. `upsertStagePairs` transaction boundary — Blocker (duplicates item 2 above)**
The method signature `upsertStagePairs(pointIds: string[]): Promise<void>` does not accept a
Prisma transaction client. This must be revised before the developer touches `CaminosService`.
Proposed signature: `upsertStagePairs(pointIds: string[], tx: Prisma.TransactionClient):
Promise<void>`. The method lives in `StagesService` to keep concerns separated, but it receives
the outer `tx` from `CaminosService`.

**7b. `findByCamino` batch query implementation is under-specified**
The ticket says "use `findMany` with an `IN` filter on `(startPointId, endPointId)` pairs."
Prisma does not natively support composite `IN` filters across two columns. The developer will
need to either:
- Fetch all stages whose `startPointId` is in the set of known start-point IDs, then filter
  in-memory (safe at small scale, but leaks unrelated stages).
- Use `prisma.$queryRaw` with `ANY(ARRAY[...])` or a values-list join.
- Use `findMany` with an `OR` array of `{ startPointId, endPointId }` conditions — Prisma
  supports this as `where: { OR: pairs.map(p => ({ startPointId: p.s, endPointId: p.e })) }`.

The OR approach is the cleanest and requires no raw SQL. The ticket should specify this
explicitly so the developer does not write an N+1 loop or incorrect IN query. At scale (caminos
with 30+ stages) the OR array is still efficient because it is bounded by the number of stages
for a single camino.

**7c. `StageListItem.id` nullability conflict (duplicates item 3)**
The type definition says `id: string` (non-nullable). Section 3.1 note 4 says `id: null` is
possible. One of these must be corrected. Given the resolved decision (eager creation guarantees
rows), `id: string` is correct and note 4 should be struck from section 3.1.

**7d. Cache invalidation after PATCH is incomplete**
UC-3 step 7 says to invalidate `['stage', caminoId, stageNumber]` on success. But it omits
`['stages', caminoId]` (the list query). After a PATCH, the stage list on the Camino detail page
will continue to show the stale `distance` value until the list query expires. Both keys must be
invalidated. Add this to the DoD checklist.

**7e. `stage_detail.meta_description` i18n key has `{number}` but `generateMetadata` on
`page.tsx` has no documented access to the stage's point names**
The ticket lists `stage_detail.meta_description` as `"View the details of stage {number} of this
pilgrimage route."` — this only uses `{number}`, which is available from the URL param, so
`generateMetadata` can resolve it without a data fetch. No blocker, just worth confirming the
developer does not attempt a server-side data fetch in `generateMetadata` to populate point names
that are not actually in the key.

**7f. Owner role contradicts itself across sections**
The "Out of Scope" section says: "`owner` role editing stages — owners can edit Caminos
(PILLY-CAM-002) but not stages (this ticket explicitly restricts stage editing to `pilgrim` role
only)." But the Resolved Decisions section (item 5) says: "Owners and pilgrims have identical
write capabilities." And UC-2 and acceptance criteria say owners see the Edit button. The Out of
Scope statement is a leftover from a prior draft and directly contradicts the resolved decision.
It must be removed to avoid the developer implementing a separate `owner` role guard on the
PATCH endpoint.

---

## Prioritised Action Items

| Priority | Item | Who must act | When |
|----------|------|-------------|------|
| **P0 — Blocker** | Revise `upsertStagePairs` signature to accept `Prisma.TransactionClient`; it must execute within the existing `CaminosService.$transaction` context (items 2 and 7a) | Developer + ticket owner | Before coding begins |
| **P0 — Blocker** | Remove or correct section 3.1 note 4 (`id: null`); the null-id code path contradicts eager creation and will mislead the backend developer into writing dead code (items 3 and 7c) | Ticket owner | Before coding begins |
| **P0 — Blocker** | Remove the contradictory "Out of Scope" bullet about owner role (item 7f) | Ticket owner | Before coding begins |
| **P1 — High** | Clarify UC-1 step 2: stage data is fetched client-side via `useStages` after hydration, not server-side; explicitly acknowledge the SEO trade-off as a conscious decision (item 6) | Ticket owner | Before frontend coding begins |
| **P1 — High** | Specify that the `findByCamino` batch query uses `where: { OR: [...] }` to avoid ambiguity; document the OR approach as the implementation target (item 7b) | Ticket owner | Before backend coding begins |
| **P1 — High** | Add `['stages', caminoId]` to the cache invalidation list in UC-3 step 7 and the frontend DoD checklist (item 7d) | Ticket owner | Before implementation |
| **P2 — Medium** | Add `@updatedAt` to `Stage.updatedAt` in the schema, or add a prominent comment in the migration file requiring `updatedAt: new Date()` on every update call (item 1) | Developer | During schema authoring |
| **P2 — Medium** | Specify graceful degradation in `UpdateCaminoForm` when `useStages` is loading or errored at the time of submit (item 4) | Ticket owner | Can be resolved in PR review |
| **P3 — Low** | Add a code comment to the migration file noting the `updatedAt === createdAt` cleanup heuristic limitation for enriched-then-cleared stages (item 5) | Developer | During migration authoring |

---

*Review complete. No implementation has been performed. All file paths referenced are absolute.*
