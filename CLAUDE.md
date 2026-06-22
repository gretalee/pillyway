# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Non-Negotiable Rules

- **Never open, read, or write any `.env` file.** The only exception is `.env.example` (no real credentials, safe to edit). If a task requires changing environment variables, print the exact lines the user must add or remove and ask them to apply the change themselves.
- **Never skip a test because data or configuration is missing.** A missing prerequisite (no seeded records, env var not set, backend unreachable) must cause the test to **fail with a clear assertion error**, never to be skipped. `test.skip()` and `testInfo.skip()` are forbidden for this purpose. Use `expect(value, 'descriptive message').toBeTruthy()` or a direct `expect` assertion so the failure is immediately visible in CI and local runs.

## Project Description

**Pillyway** is a pilgrimage route planning app. It helps users discover and plan personal pilgrimages.

### Core Features

- Browse pilgrimage routes, individual stages, and logistics (travel connections, food, accommodation)
- Any visitor (unauthenticated) can view routes and accommodations
- Authenticated users with the **pilgrim** role can create, edit, and delete any camino, stage, accommodation, and sight
- Authenticated users with the **owner** role can access the backoffice
- Planned (later phase): authenticated users can compose a personal custom route from existing stages

### User Roles

| Role key  | Capabilities                                                                              |
| --------- | ----------------------------------------------------------------------------------------- |
| (none)    | View all public content (caminos, stages, accommodations, sights)                         |
| `pilgrim` | + Create, edit, and delete any camino; edit any stage, accommodation, sight               |
| `owner`   | Backoffice access only — in Kinde, every `owner` user is also assigned the `pilgrim` role |

> **Permission rule**: all content write operations (camino create/edit/delete, stage edit, accommodation edit, sight edit) require the `pilgrim` role. Check **only** `pilgrim` — never check for `owner` on content routes. The `owner` role is reserved exclusively for backoffice features. There is no per-entity ownership check — role alone determines access.

### Domain Entities (initial)

- **Route** — a named pilgrimage route with metadata
- **Stage** — an individual leg of a route (ordered, with distance / duration)
- **Accommodation** — lodging option linked to a stage or location
- **Review** — user-authored rating + text, attached to a Route or Accommodation
- **User** — authenticated user with a role (`pilgrim` | `owner`)

---

## Runtime & Package Manager

- Node.js 24.14.0 (see `.node-version`). Activate with `nodenv` or `fnm` before installing.
- Use **yarn** exclusively — never `npm` or `pnpm`. Enable via `corepack enable` if yarn is missing.
- The root `package.json` has **no `"workspaces"` field** — never use `yarn workspace @pillyway/backend <script>`. Use the root proxy scripts (e.g. `yarn dev:backend`) or `yarn --cwd apps/backend <script>` for direct invocation.

## Commands

```bash
# Install all workspace dependencies (run from repo root)
yarn install

# Backend (NestJS)
yarn dev:backend          # start with hot-reload
yarn build:backend        # production build

# Frontend (Next.js)
yarn dev:frontend         # start Next.js dev server
yarn build:frontend       # production build

# E2E tests (Playwright)
yarn test:e2e

# Target a specific workspace directly
yarn --cwd apps/backend <script>
yarn --cwd apps/frontend <script>

# Add a shadcn/ui component (run from app/frontend/)
npx shadcn@latest add <component>
```

## Monorepo Structure

```
pillyway/
├── app/
│   ├── backend/    # NestJS + TypeScript (@pillyway/backend)
│   ├── frontend/   # Next.js App Router (@pillyway/frontend)
│   └── e2e/        # Playwright E2E tests (@pillyway/e2e)
├── packages/       # shared packages (future use)
├── package.json    # yarn workspaces
└── CLAUDE.md
```

## Architecture Overview

Pure web application. The source code is open-source.

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui 4, CVA (class-variance-authority), TanStack Query, Zustand — **Next.js 16 is beyond the Claude training cutoff; read `node_modules/next/dist/docs/` or the official docs before assuming API behaviour**
- **Backend & API**: NestJS + TypeScript, hosted on Hetzner
- **Database**: Supabase (PostgreSQL)
- **Auth**: Kinde or Clerk
- **State**: TanStack Query for server state; Zustand for client-side state
- **Testing**: Playwright (E2E)

## Agents

Specialized sub-agents are defined in `.claude/agents/` and invoked automatically for their domains:

- `nestjs-backend-developer` — backend API work
- `senior-frontend-dev` — Next.js / web frontend
- `qa-security-validator` — security review and QA
- `product-owner` — user stories, tickets, acceptance criteria
- `software-architect-lead` — architecture and system design

Each agent maintains persistent memory under `.claude/agent-memory/<agent-name>/`.

## Development Process

All agents must follow this workflow for every iteration.

### 0. Precondition — Feature Branch

Before any work begins, create a dedicated branch from `main`:

```bash
git checkout main
git pull
git checkout -b feature/<short-description>
```

- Branch names use the `feature/` prefix followed by a kebab-case description (e.g. `feature/user-reviews`).
- Never commit feature work directly to `main`.
- All subsequent steps happen on this branch.

### 1. Requirements & Contextual Preparation

- The `product-owner` agent defines functional requirements for the iteration.
- The `software-architect-lead` reviews for technical feasibility and enriches the task with contextual anchors (API endpoints, data models, architectural patterns).
- Output: a detailed technical ticket with a **Definition of Done (DoD)** before any code is written.

### 2. Agentic Task Distribution

- The `software-architect-lead` triggers the `nestjs-backend-developer` and `senior-frontend-dev` agents.
- `senior-frontend-dev` and `nestjs-backend-developer` work in parallel on a shared feature branch.
- Synchronization contract: an **OpenAPI/Swagger spec** is agreed upon first and must not be broken unilaterally. All changes to the contract require both agents to update their implementations.

### 3. Continuous Validation (AIQE Loop)

- The `qa-security-validator` agent defines test criteria **before** implementation begins (TDD).
- `nestjs-backend-developer` and `senior-frontend-dev` generate unit and integration tests alongside the feature code — not after.
- The `qa-security-validator` runs automated security scans and logic checks continuously and feeds findings back to `nestjs-backend-developer` and `senior-frontend-dev` for immediate correction.

### 4. Automated & Human Review

- On completion, a Pull Request is opened targeting `main`.
- **Stage 1 — Automated**: CI/CD runs linting, SAST security scans, and the full test suite. All checks must pass.
- **Stage 2 — Human review**: A human Software Architect or Senior Developer reviews AI-generated logic for long-term maintainability. Review comments (`ReviewHints`) are addressed by the agent before re-review.
- The PR is merged **only after a formal human Approve**.

### 5. Documentation & Learning

- After merge, `nestjs-backend-developer` updates API docs and `senior-frontend-dev` updates frontend documentation to reflect the changes.
- Agent memory files under `.claude/agent-memory/` are updated with any new patterns, conventions, or decisions discovered during the iteration.

## Seed Data Conventions

Seed files live in `/scripts/data/` at the **repo root** — not in `apps/backend/scripts/data/`.

The `country` field on every waypoint/point record must be the **full lowercase English country name** (e.g. `"germany"`, `"denmark"`, `"italy"`), never an ISO code. `StageList.tsx` calls `tCodes(stage.startPoint.country.toLowerCase())` which looks up keys in the `country_codes` i18n namespace — the DB value must match exactly.

**Accommodation `priceRange` values** use these bands (price per person per night):

| Value | Range |
|---|---|
| `budget` | €0–30 |
| `moderate` | €31–60 |
| `comfortable` | €61–120 |
| `luxury` | €121+ |

When the exact price is unknown, use the most likely band for the property type (DJH hostels → `budget`, monastery pilgrim rooms → `budget`/`moderate`, rural 3-star hotels → `comfortable`).

## Backend Conventions (NestJS)

- Use `ConfigService` for all env access — never `process.env` directly in services
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- DTOs for all request/response shapes with `class-validator` decorators
- Feature-based module structure; avoid dumping logic in `AppModule`
- Use `@Exclude()` / `@Expose()` serialization — never expose sensitive fields raw
- Constructor-based DI only — never instantiate services manually

### Database (Prisma)

Prisma 7 is the ORM. The schema lives at `apps/backend/prisma/schema.prisma`; the client is provided globally by `PrismaModule` / `PrismaService`.

**Connection split (two URLs required):**
| Variable | Purpose | Value |
|---|---|---|
| `DATABASE_URL` | Runtime queries via `PrismaClient` | Direct URL locally; pooler URL (Supavisor) on Supabase Cloud |
| `DIRECT_URL` | `prisma migrate` commands | Always the direct connection; never a pooler |

**When to run migrations:**

| Situation                                     | Command                                        | Who runs it                                                                 |
| --------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| Schema change during development              | `yarn prisma:migrate:dev --name <description>` | Developer locally — creates a migration file and applies it to the local DB |
| After pulling a branch with new migrations    | `yarn prisma:migrate:deploy`                   | Developer locally, or CI/CD pipeline                                        |
| Production deploy (CI/CD)                     | `yarn prisma:migrate:deploy`                   | CI pipeline, before the app process starts                                  |
| Regenerate TypeScript types after schema edit | `yarn prisma:generate`                         | Automatically via `postinstall`; also run manually after editing the schema |

**Rules:**

- Schema changes → always go through `prisma migrate dev` (never hand-edit the database)
- Custom SQL (expression indexes, RLS policies, stored procedures) → add manually to the generated migration file before committing
- Never run `prisma migrate reset` in production — it drops the entire database
- `prisma.config.ts` at the backend root controls the migration URL; do not add `url`/`directUrl` back to `schema.prisma`

**Migration hygiene — the root cause of recurring drift:**

The following actions corrupt the migration history and must never happen:

| Forbidden action                                                         | Why it breaks things                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `prisma db push` on a local dev DB                                       | Applies schema changes without creating or recording a migration     |
| `prisma db execute` for DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX, …) | Applies SQL to the DB without recording it in `_prisma_migrations`   |
| Editing a migration file after `prisma migrate dev` has applied it       | Changes the file checksum; Prisma detects the file was tampered with |
| Applying SQL via `psql` or a GUI client for schema changes               | Same as `db execute` — leaves no migration record                    |

**Correct workflow for every schema change:**

1. Edit `prisma/schema.prisma`
2. Run `yarn prisma:migrate:dev --name <short-description>` from `apps/backend/` — this creates the migration file **and** records it in `_prisma_migrations` atomically
3. Commit `schema.prisma` and the new migration file together in the same commit
4. Before opening a PR, run `yarn prisma:migrate:dev` once more and confirm the output is `Already in sync, no schema change or pending migration was found.`

**Iteration during development:**
If you need to tweak the schema while still on a feature branch (before committing the migration), do **not** run `prisma migrate dev` multiple times on a partially-changed schema. Instead, delete the draft migration directory, revert `schema.prisma` to its last committed state, make all schema changes at once, then run `prisma migrate dev --name <description>` a single time.

**Backward-compatible migrations (required):**

Migrations run inside the container entrypoint before the app starts (`entrypoint.sh`). This means a migration can reach production while the previous container version is still handling traffic during a rolling restart. Every migration must therefore be backward-compatible with the currently deployed code:

| Change type | Rule |
|---|---|
| Adding a column | Always nullable (`?`) or with a `DEFAULT` — old code ignores unknown columns |
| Renaming a column | Expand-contract: add the new column → deploy code that writes both → drop the old column in the *next* release |
| Removing a column | Stop referencing it in code first → deploy → drop in a follow-up migration |
| Changing a column type | Almost always requires expand-contract across two releases |

Before writing any schema change, ask: *"Can the current production code handle this migrated schema without modification?"* If no, split the change across two releases.

## Frontend Conventions (Next.js)

### Code Style

- TypeScript strict mode; no `any`
- Next.js App Router — use the `app/` directory; there is no `pages/` directory
- Write **explicit, readable code** — prefer clear conditional logic over clever one-liners
- Minimize `useEffect()` — use it only when truly necessary (external subscriptions, imperative DOM APIs). Derive state from existing state instead of syncing it via effects.
- No hardcoded strings — use i18n keys
- No `console.log` in production code
- Components go into the shared library if used in more than one place

### Styling & Components

- Tailwind CSS classes are always preferred over custom CSS
- Use **shadcn/ui** for all base UI components; add new components with `npx shadcn@latest add <component>` run from `app/frontend/`
- Use **CVA** (class-variance-authority) for custom component variants alongside shadcn
- The `Providers` component wraps `QueryClientProvider` and is mounted in the root layout

### State Management

- Use **TanStack Query** for all server state and data fetching — no ad-hoc `fetch` calls outside of query functions
- Use **Zustand** for client-side state (UI state, user preferences, cross-component state not tied to server data)

### Data Access Architecture

The frontend **never contacts Supabase directly**. All data retrieval and mutation goes through the NestJS backend API. The `@supabase/supabase-js` package is not a frontend dependency; there are no Supabase env vars in the frontend. Any PR that adds a Supabase client, `NEXT_PUBLIC_SUPABASE_*` env vars, or direct PostgREST calls to the frontend must be rejected.

### API Request Rules

Follow this checklist whenever a component needs to call the backend:

1. **Check first** — look for an existing hook in `apps/frontend/app/api/`. If one covers the endpoint, use it directly; do not duplicate.
2. **Create a hook if missing** — add a file `apps/frontend/app/api/use-<resource>.ts`. Export the raw async fetch function and a named hook (`use<Resource>`) that wraps it with TanStack Query.
3. **TanStack Query for every request type** — GET requests use `useQuery`; POST / PUT / PATCH / DELETE use `useMutation`. No bare `fetch` calls inside components.
4. **Follow the Swagger contract** — align request/response shapes with the backend's OpenAPI definition (`GET /api/docs`). Never guess field names or types.
5. **Auth token injection belongs in `app/api/`** — hooks that call authenticated endpoints must retrieve the Kinde token internally (`useKindeBrowserClient`). Components must never access `accessTokenEncoded` directly.

### Layout & Interaction

- Every page scrolls by default — do not set `overflow: hidden` on page roots
- No interactive elements (buttons, tappable areas) placed at the outermost horizontal edges — always apply safe horizontal padding
- Font sizes must respect browser accessibility settings — use relative units (`rem`); never hardcode font sizes in absolute `px`

### Accessibility & SEO

- Web output must meet WCAG accessibility standards: semantic HTML, ARIA labels on interactive elements, sufficient color contrast, keyboard navigability
- Every page must include SEO-relevant meta tags: `<title>`, `<meta name="description">`, Open Graph tags (`og:title`, `og:description`, `og:image`)

## E2E Testing Conventions (Playwright)

The Playwright config uses `fullyParallel: true`. All spec files that touch the database must be written to avoid concurrent session conflicts with the shared Kinde pilgrim account.

### Structure rules

- **One `test.describe` per spec file.** Multiple describe blocks in one file run concurrently and cause Kinde session collisions.
- **Serial mode for any test that mutates data.** Add `test.describe.configure({ mode: 'serial' })` at the top of the describe block whenever tests create, update, or delete caminos or stages.
- **One shared test camino per describe.** Create it in `beforeAll`, reuse it across all tests in the describe, delete it in `afterAll`. Never rely on seeded data that may change between runs.
- **Full-flow tests over micro-tests.** Combine related assertions into one test that walks a complete user journey. One test per tiny scenario multiplies Kinde logins and slows the suite.

### Hook timeout rules

- `test.setTimeout(60_000)` — set on the describe block when `beforeEach` performs a Kinde login (~15–20 s), so the test body still has budget.
- `testInfo.setTimeout(90_000)` — set as the **first line** of every `beforeAll` and `afterAll` that performs a login + UI operation, because `test.setTimeout` does not extend hook timeouts.
- `testInfo.setTimeout(120_000)` — use for `beforeAll` hooks that additionally navigate and fill forms after creating the camino (e.g. enriching a stage).

### Cleanup rules

- Cleanup in `afterAll` is best-effort — use `isVisible({ timeout: 5_000 }).catch(() => false)` (soft check) for every menu item click. A failed cleanup must never fail a test.
- Hard `expect(...).toBeVisible()` assertions belong only in test bodies, never in `beforeAll`/`afterAll` cleanup blocks.
