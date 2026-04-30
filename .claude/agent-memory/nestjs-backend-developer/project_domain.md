---
name: "Pillyway domain model"
description: "What Pillyway is, its core entities, and user roles — foundational context for all backend work"
type: project
---

Pillyway is a pilgrimage route planning app. Users discover routes, stages, and accommodations; logged-in users review them; Route Editors manage route data.

**Why:** Understanding the domain prevents mismodeling entities (e.g., treating Stage as a top-level resource independent of Route, or conflating Accommodation reviews with Route reviews).

**How to apply:** Every new API endpoint, DTO, and database entity should map cleanly to one of the core domain entities below. Authorization guards must enforce the role matrix.

## Core Entities (PILLY-CAM-001 introduces Caminos nomenclature)
- **Camino** (was Route) — named pilgrimage route. Table: `caminos`. Fields: id, name, description, verified, created_by (NOT NULL), created_at, updated_at.
- **CaminoPoint** (was Stage/waypoint) — an individual geographic point on a camino. Table: `camino_points`. Unique on (name, country). Global/shared — not user-owned.
- **CaminoPointOrder** — join table: camino_id + camino_point_id + position (1-based). Composite PK (camino_id, camino_point_id).
- **Accommodation** — lodging linked to a Stage or geographic location
- **Review** — user-authored rating + text body, polymorphic: attached to a Route OR an Accommodation
- **User** — authenticated user with a role

## User Roles
| Role | Default | Kinde key | Permissions |
|---|---|---|---|
| Guest (unauthenticated) | — | — | Read caminos, accommodations |
| Reviewer | Yes (all new users) | reviewer | + Create reviews |
| Route Editor / Pilgrim | Assigned | `pilgrim` | + Create caminos via POST /api/caminos |

Note: the Kinde role key for camino creation is `pilgrim` (confirmed in ticket PILLY-CAM-001). `RolesGuard` does exact string match on `role.key`.

## Module structure (as of PILLY-CAM-001)
- `CaminosModule` — GET/POST /api/caminos, imports AuthModule
- `CaminoPointsModule` — GET /api/camino-points/search, no auth
- `CountriesModule` — GET /api/countries, static list, no auth, no DB
- `SupabaseModule` — @Global(), exports SupabaseService (service-role key)
- `AuthModule` — KindeJwtStrategy, JwtAuthGuard, RolesGuard

## Transaction strategy
All writes to caminos go through the `create_camino` PostgreSQL SECURITY DEFINER function via `supabase.rpc()`. The Supabase JS SDK does not expose a transaction API so the RPC pattern is mandatory for atomicity.

## Planned (later phase)
- Personal route composition: authenticated users can assemble a custom route from existing stages
