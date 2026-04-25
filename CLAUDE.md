# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

**Pillyway** is a pilgrimage route planning app. It helps users discover and plan personal pilgrimages.

### Core Features
- Browse pilgrimage routes, individual stages, and logistics (travel connections, food, accommodation)
- Any visitor (unauthenticated) can view routes and accommodations
- Authenticated users can write reviews for routes and accommodations
- Authenticated users with the **Route Editor** role can create and manage routes via dedicated input forms
- Planned (later phase): authenticated users can compose a personal custom route from existing stages

### User Roles
| Role | Default | Capabilities |
|---|---|---|
| Guest | — | View routes, stages, accommodations |
| Reviewer | Yes (all new users) | + Write reviews for routes & accommodations |
| Route Editor | Assigned | + Create and edit pilgrimage routes and stages via input forms |

### Domain Entities (initial)
- **Route** — a named pilgrimage route with metadata
- **Stage** — an individual leg of a route (ordered, with distance / duration)
- **Accommodation** — lodging option linked to a stage or location
- **Review** — user-authored rating + text, attached to a Route or Accommodation
- **User** — authenticated user with a role (Reviewer | Route Editor)

---

## Runtime & Package Manager

- Node.js 24.14.0 (see `.node-version`). Use `nvm` or `fnm` to switch before installing.
- Use **yarn** exclusively — never `npm` or `pnpm`.

## Architecture Overview

Single Expo codebase that compiles to iOS, Android, and Web. The source code is open-source.

- **Frontend**: Expo (React Native), NativeWind v4, shadcn-react-native, CVA (class-variance-authority)
- **Backend & API**: NestJS + TypeScript, hosted on Hetzner via Coolify
- **Database**: Supabase (PostgreSQL)
- **Auth**: Kinde or Clerk via Expo `AuthSession`
- **State**: TanStack Query for server state; Zustand or Jotai for client state
- **Testing**: Vitest + React Testing Library (unit/integration), Playwright (web E2E), Detox or Maestro (mobile E2E)

## Agents

Specialized sub-agents are defined in `.claude/agents/` and invoked automatically for their domains:

- `nestjs-backend-developer` — backend API work
- `senior-frontend-dev` — React Native / Expo / web frontend
- `qa-security-validator` — security review and QA
- `product-owner` — user stories, tickets, acceptance criteria
- `software-architect-lead` — architecture and system design

Each agent maintains persistent memory under `.claude/agent-memory/<agent-name>/`.

## Development Process

All agents must follow this workflow for every iteration.

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

## Backend Conventions (NestJS)

- Use `ConfigService` for all env access — never `process.env` directly in services
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- DTOs for all request/response shapes with `class-validator` decorators
- Feature-based module structure; avoid dumping logic in `AppModule`
- Use `@Exclude()` / `@Expose()` serialization — never expose sensitive fields raw
- Constructor-based DI only — never instantiate services manually

## Frontend Conventions

### Code Style
- TypeScript strict mode; no `any`
- Expo Router for file-based navigation with type-safe route params
- Write **explicit, readable code** — prefer clear conditional logic over clever one-liners
- Minimize `useEffect()` — use it only when truly necessary (external subscriptions, imperative DOM/native APIs). Derive state from existing state instead of syncing it via effects.
- No hardcoded strings — use i18n keys
- No `console.log` in production code
- Components go into the shared library if used in more than one place

### Layout & Interaction
- Every page scrolls by default — wrap content in `ScrollView` (or equivalent) unless there is an explicit reason not to
- No interactive elements (buttons, tappable areas) placed at the outermost horizontal edges — always apply safe horizontal padding
- Font sizes must respect OS accessibility settings — use relative units or `useWindowDimensions` / `PixelRatio`; never hardcode `fontSize` in absolute px

### Web-Specific
- Web output must meet WCAG accessibility standards: semantic HTML, ARIA labels on interactive elements, sufficient color contrast, keyboard navigability
- Every web page must include SEO-relevant meta tags: `<title>`, `<meta name="description">`, Open Graph tags (`og:title`, `og:description`, `og:image`)
