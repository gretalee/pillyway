---
name: "Pillyway domain model"
description: "What Pillyway is and its domain model — context for architecture decisions"
type: project
---

Pillyway is a pilgrimage route planning app. Next.js 16 App Router frontend (web only), NestJS backend on Hetzner/Coolify, Supabase (PostgreSQL), Kinde for auth.

**Why:** Architecture decisions (API shape, DB schema, auth strategy) must fit the domain and phased rollout plan.

**How to apply:** Design for Phase 1 entities now; keep the schema extensible for the Phase 2 personal route builder without a breaking migration.

## Domain Entities & Key Relationships
- Camino 1──* CaminoPointOrder *──1 CaminoPoint (many-to-many with ordering)
- CaminoPoint 1──* Accommodation
- CaminoPoint 1──* Sight
- Stage: start CaminoPoint → end CaminoPoint; auto-created for consecutive pairs in a Camino
- Review *──1 Camino or Accommodation (future phase)
- User managed by Kinde (not stored in DB directly; referenced by string `createdBy` field)

## Confirmed Roles (PILLY-CAM-001, PILLY-POI-001)
- `pilgrim` — Kinde role key; grants all content writes (caminos, accommodations, sights, stages). Code checks ONLY this role for content routes.
- `owner` — backoffice only; every `owner` also holds `pilgrim` in Kinde. Never check `owner` on content routes.
- Unauthenticated: read-only

## Backend Module Boundaries (after PILLY-POI-001)
- `WaypointsModule`: GET /waypoints/:slug (metadata only, no aggregation), POST /waypoints/:slug/accommodations, POST /waypoints/:slug/sights
- `AccommodationsModule`: GET /accommodations/:id, GET /accommodations?caminoPointId=, PATCH /accommodations/:id, DELETE /accommodations/:id
- `SightsModule`: GET /sights/:id, GET /sights?caminoPointId=, PATCH /sights/:id, DELETE /sights/:id
- WaypointsModule does NOT import AccommodationsModule or SightsModule — clean boundary

## Schema Facts (after PILLY-POI-001 migration)
- `Accommodation` gains: type (AccommodationType enum, NOT NULL default hostel), email?, website?, addressStreet?, addressZip?, addressCity?, addressCountry?, priceRange (PriceRange enum)?
- `Sight` gains: address?, latitude (Float)?, longitude (Float)?
- Enums: AccommodationType (hostel|monastery|b_and_b|hotel|apartment|private_room), PriceRange (budget|moderate|comfortable|luxury)
- Frontend renders PriceRange as €/€€/€€€/€€€€ — mapping is hardcoded in the frontend, not from the backend

## Phase 2 (later)
- UserRoute: a user-assembled ordered set of Stages from one or more Routes
- Verification workflow on Accommodations (admin sets verified=true)
- User reviews on Accommodations
- Map rendering for Sight lat/lon
