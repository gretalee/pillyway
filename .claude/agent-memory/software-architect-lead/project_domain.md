---
name: "Pillyway domain model"
description: "What Pillyway is and its domain model — context for architecture decisions"
type: project
---

Pillyway is a pilgrimage route planning app. Next.js 16 App Router frontend (web only), NestJS backend on Hetzner/Coolify, Supabase (PostgreSQL), Kinde for auth (SDK v2.12.1).

**Why:** Architecture decisions (API shape, DB schema, auth strategy) must fit the domain and phased rollout plan.

**How to apply:** Design for Phase 1 entities now; keep the schema extensible for the Phase 2 personal route builder without a breaking migration.

## Domain Entities & Key Relationships
- Route 1──* Stage
- Stage 1──* Accommodation
- Review *──1 Route (or) Accommodation  (polymorphic)
- User 1──* Review

## Roles
- Guest (unauthenticated): read-only
- Reviewer (default): + write reviews
- Route Editor (assigned): + write routes / stages / accommodations

## Phase 2 (later)
- UserRoute: a user-assembled ordered set of Stages from one or more Routes
