---
name: playwright-test-writer
description: Writes Playwright E2E tests for the Pillyway frontend that follow this repo's testing conventions (one test.describe per file with exactly one test() covering one user use-case, serial-safe setup via helpers, accessible locators only, no arbitrary timeouts, timeout-escalation rules, the non-negotiable no-skip rule). Use this whenever the user asks to write, add, generate, or update an E2E test / Playwright test for a Pillyway page or user flow, or mentions apps/e2e/tests, test.describe, Kinde login flows, or camino/waypoint/accommodation/sight CRUD flows in a testing context.
---

# Playwright Test Writer

Writes new E2E spec files (or extends existing ones) under `apps/e2e/tests/`,
matching the structure, locator, synchronization, and cleanup conventions
established in this repo — not a generic Playwright tutorial pattern.

## Before you start: read the live conventions

Rules drift; read these fresh rather than trusting a summary baked into this
skill:

- **CLAUDE.md → "E2E Testing Conventions (Playwright)"** — the canonical,
  written-down rules (structure, hook timeouts, cleanup). Treat this as the
  source of truth if anything here seems to disagree with it.
- **`apps/e2e/tests/helpers/`** — every reusable setup/navigation/cleanup
  helper, split by concern: `login-helpers.ts` holds login/session/naming
  helpers (`setLanguageToEnglish`, `loginAs`, `logout`, `uniqueName`),
  `camino-helpers.ts` holds all camino creation/fixture-data/cleanup helpers,
  and `index.ts` is a pure barrel (`export * from './login-helpers'` +
  `export * from './camino-helpers'`) so every spec file still imports from
  `'./helpers'` regardless of which file a given helper actually lives in.
  Read the relevant file(s) in full before writing any new test — duplicating
  a helper inline instead of reusing (or extending) it is the most common way
  new specs drift from convention. If a new concern (a new entity, or
  something else that doesn't fit login/camino) accumulates enough dedicated
  helpers to be worth splitting out, give it its own `<concern>-helpers.ts`
  and add it to the `index.ts` barrel, following the same pattern.
- **A recently-written spec file covering a similar flow** — check
  `apps/e2e/tests/` for the closest existing match before starting from
  scratch. Match its shape.
- **`apps/e2e/playwright.config.ts`** and **`apps/e2e/.env.example`** — base
  URL, required env vars, the global `retries: 2` (CI only) setting. Never
  open `apps/e2e/.env` itself (only `.env.example`) — if a new env var is
  needed, tell the user the exact line to add.

## Step 1: Confirm scope

If the user hasn't said, ask (or infer from context):

- Which single user use-case is being tested (see "One file, one test, one
  use-case" below)? If what's being asked for is actually two use-cases
  (e.g. "test login and also test camino filtering"), that's two files.
- Public/unauthenticated, or does it need the pilgrim role
  (`E2E_PILGRIM_EMAIL`/`PASSWORD`) or the owner-without-pilgrim account
  (`E2E_OWNER_EMAIL`/`PASSWORD`, used for ownership/permission checks)?
- Does the flow create, update, or delete data? This decides whether
  `test.describe.configure({ mode: 'serial' })` and a `beforeAll`/`afterAll`
  fixture are needed.
- New file, or does an existing file already cover this exact use-case and
  just needs another expectation added to its single test?

## Step 2: One file, one test, one use-case

- **One spec file per user use-case.** Examples: `login-logout.spec.ts`,
  `see-and-filter-caminos.spec.ts`, `create-camino.spec.ts`. If a flow
  naturally splits into distinct use-cases (e.g. "public viewing" vs.
  "pilgrim editing" vs. "API-level authorization" for the same feature),
  that's multiple files, not one file with multiple concerns.
- **One `test.describe` per file, and exactly one `test()` inside it**,
  containing every expectation for that use-case in sequence. Nested/
  multiple `test()` blocks are hard to target individually in Playwright's
  UI mode, and each additional authenticated `test()` multiplies Kinde
  logins. A single test walking the full journey step by step — with many
  `expect()` calls along the way — is correct here, not a compromise.
- **Every expectation gets a description**, so a failure is identifiable at
  a glance without reading the surrounding code:

  ```ts
  await expect(page.getByRole('heading', { name: caminoName }), 'camino heading must show the new name after rename')
    .toBeVisible();
  ```

- **Serial mode** (`test.describe.configure({ mode: 'serial' })`) is still
  required whenever the use-case creates/updates/deletes data — it's what
  keeps a `beforeAll` fixture safe to build once and reuse.
- **One shared fixture per file**, created in `beforeAll`, reused through
  the single test, deleted in `afterAll`. Never assume seeded data exists.

## Step 3: Hook timeout rules

- `test.setTimeout(60_000)` on the describe block (or on the single `test()`
  itself) whenever the test performs a Kinde login. Login alone takes
  ~15–20s.
- `testInfo.setTimeout(90_000)` — **first line** of every `beforeAll`/
  `afterAll` that performs a login + one UI operation. `test.setTimeout`
  does NOT extend hook timeouts — hooks need their own call.
- `testInfo.setTimeout(120_000)` — for `beforeAll` hooks that additionally
  navigate and fill forms after creating the shared fixture.

## Step 4: Cleanup rules

- Cleanup in `afterAll` is **best-effort** — soft-check every step with
  `await x.isVisible({ timeout: 5_000 }).catch(() => false)` before acting.
  A failed cleanup must never fail a test run.
- Hard `expect(...)` assertions belong **only** in the test body — never in
  `beforeAll`/`afterAll` cleanup blocks.

## Step 5: Locators

- **Accessible locators only**: `getByRole`, `getByLabel`, `getByText`,
  `getByPlaceholder`. These match what a real user (or screen reader) would
  perceive, and survive markup refactors.
- **Never use a CSS class as a locator.** Classes are styling hooks, not
  contracts, and change with every design tweak.
- **Never use generated/internal framework attributes or fragile DOM
  structure as a locator** — e.g. React/Next.js internals, auto-generated
  hash classes, or a brittle `div > div:nth-child(3) > span` chain. If no
  accessible locator exists for something that needs one, that's a product
  bug (missing `aria-label`/role) worth flagging, not a reason to fall back
  to structural coupling.
- An attribute selector on a stable, intentional attribute (e.g.
  `[aria-label*="Actions for"]`, an `href` match) is acceptable when no
  `getByRole`/`getByLabel` query fits — this is different from a CSS class
  or generated attribute, since `aria-label`/`href` are part of the
  accessible/functional contract, not implementation detail.
- **`getByRole(..., { name })` (and `getByLabel`/`getByText`) match by
  case-insensitive substring unless `exact: true` is passed** — a short
  target name can silently match an unrelated element whose accessible name
  happens to contain it (e.g. `{ name: 'EN' }` also matches a burger button
  labeled "Main menu", since "menu" contains "en"; confirmed to actually
  happen in `language-switch.spec.ts`). Always pass `exact: true` for short
  (\<~4 char) or common-word target names — anything where the string could
  plausibly appear as a substring of a longer, unrelated label elsewhere on
  the page. When a locator needs `.first()`/`.last()` to work, treat that as
  a signal to look for this kind of accidental collision, not just page
  duplication — check whether the intended element is genuinely duplicated
  before assuming a naming collision is the cause.

## Step 6: Synchronization — no arbitrary timeouts, ever

- **Never use `page.waitForTimeout(...)` or any other fixed-duration sleep**
  to "wait for things to settle." It's the single biggest source of flaky
  *and* slow suites.
- **Prefer Playwright's auto-waiting and web-first assertions**
  (`await expect(locator).toBeVisible()`, `.toHaveText()`, `.toHaveURL()`,
  etc.) — these retry until the condition is true or the timeout elapses,
  which is what you actually want.
- **Wait for observable application state**, not the passage of time:
  `page.waitForURL(...)`, a locator becoming visible/enabled, a specific
  text appearing. If you find yourself reaching for a timeout, there's
  almost always an observable signal you can wait on instead — find it.
- **If a test is flaky, do not "fix" it by raising a timeout or adding
  `test.describe.configure({ retries })`.** Both hide the actual problem —
  missing synchronization on a specific state change, or unstable/shared
  test data — instead of fixing it. Identify and fix the root cause. (The
  project's global `retries: 2` in CI, in `playwright.config.ts`, is a
  separate, intentional infra-level allowance and stays as-is — this rule
  is about not adding *additional*, test-local retry overrides to paper
  over a flaky assertion.)

## Step 7: Helpers, not page objects

- **Extract recurring functionality into plain helper functions** in
  `tests/helpers/`, grouped by concern into files like `login-helpers.ts` and
  `camino-helpers.ts` (never in `index.ts`, which stays a pure re-export
  barrel) — e.g. login, camino creation, cleanup. Reuse (or extend) what's
  already there before writing new setup code inline.
- **Avoid the Page Object Model.** This repo uses plain async functions
  (`loginAs(page, email, password)`, `createCaminoWith4Points(page, name)`,
  ...) that take a `page` and return the data the test needs — not classes
  wrapping locators. Keep new helpers in that same shape.

## Step 8: Reusable test data, not re-typed literals

- **When a helper creates data (a camino's waypoints, a stage's fields, ...),
  export the literal data it uses as a named constant from its helper file**
  (e.g. `camino-helpers.ts`) — don't bury it as a private module-level array
  only the helper can see.
  Example: `CAMINO_FIXTURE_WAYPOINTS` (name/country/countryCode per waypoint)
  is exported and consumed by both `createCaminoWith4Points` (to fill the
  form) and `createCaminoViaForm` (takes just its first entry).
- **Tests that assert on that same data must import and use the constant,
  never re-type the values.** If a test checks the countries shown on a
  camino created via `createCaminoWith4Points`, it asserts against
  `CAMINO_FIXTURE_COUNTRY_CODES` (itself derived from
  `CAMINO_FIXTURE_WAYPOINTS`), not a hardcoded `'FR · ES'` string. Re-typing
  the same literal in the test lets the helper and the test silently drift
  apart — the helper's data can change while the test keeps "passing" against
  stale expectations, or a real bug hides behind a coincidentally-matching
  duplicate.
- This also strengthens weak assertions "for free": a check that could only
  afford to assert `.toContainText('Stage')` (because writing out the real
  heading felt like unmaintainable duplication) can instead assert the exact
  expected text — e.g. `` `Stage 1: ${start.name} – ${end.name}` `` — once
  that data has a single source of truth to pull from.
- Derive related constants instead of hand-computing them twice (e.g.
  `CAMINO_FIXTURE_COUNTRY_CODES` is `[...new Set(CAMINO_FIXTURE_WAYPOINTS.map(wp => wp.countryCode))].join(' · ')`,
  not a separately maintained string).

## Step 9: Before implementing — work through this checklist in order

1. Inspect existing spec files for a similar flow — don't start from a
   blank file if something close already exists.
2. Reuse existing fixtures, helpers, and exported test-data constants from
   `tests/helpers/` — including for assertions, per Step 8.
3. Identify the user-visible behavior being tested — write it down as the
   file's data/auth-strategy comment before writing any Playwright code.
4. Identify stable (accessible) locators for every interaction and
   assertion in the flow.
5. Consider whether the test's setup data should be created through the
   API instead of the UI. Today every helper in `tests/helpers/` creates
   data via the UI form (`createCaminoViaForm`, `createCaminoWith4Points`) —
   that's the current convention. Note API-based setup as an option worth
   raising with the user for a slow/flaky setup step, but don't build new
   API helpers speculatively; only add one if the user confirms they want it.
6. Consider whether authentication state can be reused instead of a fresh
   Kinde login. Today every test/hook logs in fresh — that's *why* the
   Step 3 timeout budgets exist. Playwright's `storageState` could avoid
   repeated logins, but introducing it is an architecture change (global
   setup project, revised timeout rules) — flag it as a future option if
   login overhead is the bottleneck, don't implement it inline in a new spec.
7. Only then implement the test.

## Step 10: The non-negotiable rule (CLAUDE.md)

**Never skip a test because a prerequisite is missing** (no seeded records,
an env var not set, backend unreachable). `test.skip()` and `testInfo.skip()`
are forbidden for this. Missing prerequisites must **fail** the test with a
clear assertion, e.g.:

```ts
const email = process.env.E2E_PILGRIM_EMAIL;
expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
```

This applies to `beforeAll` guard checks just as much as to the test body —
the failure needs to be loud and immediately diagnosable in CI, not silently
skipped.

## Step 11: Write the file

Start from `assets/_template.spec.ts` in this skill for the skeleton (header
comment block, single describe/single test shape, timeout placeholders).
Fill in the data/auth strategy comment honestly — it's what the next person
reads before touching the file.

## Step 12: Validate

1. Confirm the file type-checks / has no obvious syntax issues.
2. Running the test for real requires: the frontend (`yarn dev:frontend`)
   and backend (`yarn dev:backend`) running locally, and `apps/e2e/.env`
   populated with `E2E_BASE_URL`, `NEXT_PUBLIC_API_URL`, and whichever
   `E2E_PILGRIM_*`/`E2E_OWNER_*` credentials the new test needs (see
   `.env.example` for the full list — don't open the real `.env`). If those
   aren't available in the current session, say so explicitly rather than
   claiming the test passes, and tell the user the exact command to run it
   themselves: `yarn --cwd apps/e2e test <file>` (or `yarn test:ui` for the
   interactive runner).
3. If the environment is available, run it and fix failures before handing
   back — by finding the missing synchronization or unstable data, never by
   adding a timeout or a retry (see Step 6).

## Step 13: Hand back a summary

- The file path (new or edited) and which use-case it covers.
- Which env vars it requires.
- Whether you were able to run it, and the result (or why you couldn't).
- Any existing spec file structure you deliberately deviated from, and why.
