---
name: "Pillyway domain model"
description: "What Pillyway is, its core entities, user roles, and module structure — foundational context for all backend work"
type: project
---

Pillyway is a pilgrimage route planning app. Users discover routes, stages, and accommodations.

**Why:** Understanding the domain prevents mismodeling entities and ensures authorization rules are applied correctly.

**How to apply:** Every new API endpoint, DTO, and database entity should map cleanly to one of the core domain entities. Authorization guards must enforce the role matrix. Stage is a derived, shared entity — not user-created directly.

## Core Entities (current schema)
- **Camino** — named pilgrimage route. Table: `caminos`. Fields: id, name, description, verified, created_by (NOT NULL), created_at, updated_at. Unique on name (case-insensitive).
- **CaminoPoint** — individual geographic waypoint. Table: `camino_points`. Unique on (name, country). Globally shared — not per-camino.
- **CaminoPointOrder** — join table: camino_id + camino_point_id + position (1-based). Composite PK (camino_id, camino_point_id). Unique (camino_id, position).
- **Stage** — the path between two consecutive CaminoPoints. Table: `stages`. Unique on (start_point_id, end_point_id). Globally shared — one row for a point pair, reused by all Caminos that traverse it. Fields: id, startPointId, endPointId, distance (Float?), description (String?), createdAt, updatedAt (@updatedAt).
- **Accommodation** — lodging linked to a stage or location (future)
- **Review** — user-authored rating + text, polymorphic (future)

## User Roles
| Role | Kinde key | Permissions |
|---|---|---|
| Guest (unauthenticated) | — | Read caminos, camino-points, stages |
| Pilgrim / Route Editor | `pilgrim` | + Create, edit, delete any camino; edit any stage |
| Owner | `owner` | Same as pilgrim (owner always also holds pilgrim in Kinde) |

Authorization pattern: service-layer check via `userRoles.includes('pilgrim')` — NOT `@Roles` decorator on routes (except CaminosController.create which still uses RolesGuard).

## Stage creation model (eager, not lazy)
Stage rows are created/upserted eagerly inside `CaminosService.create()` and `CaminosService.update()` transactions, by calling `stagesService.upsertStagePairs(pointIds, tx)`. `upsertStagePairs` MUST receive the outer `tx` client — never opens its own `$transaction` (Prisma does not support nested interactive transactions). Old stage pairs that leave a Camino's sequence are NOT deleted (rows are shared globally).

## Module structure (as of PILLY-STG-001)
- `AppModule` — root; imports all feature modules
- `CaminosModule` — GET/POST/PATCH/DELETE /api/caminos; imports AuthModule + StagesModule
- `CaminoPointsModule` — GET /api/camino-points/search
- `CountriesModule` — GET /api/countries (static, no DB)
- `StagesModule` — GET /api/caminos/:id/stages, GET .../stages/:n, PATCH .../stages/:n; imports AuthModule; exports StagesService
- `PrismaModule` — @Global(), exports PrismaService
- `AuthModule` — KindeJwtStrategy, JwtAuthGuard, RolesGuard

## Transaction strategy (Prisma 7)
`prisma.$transaction(async (tx) => { ... })` is used in CaminosService.create() and CaminosService.update(). Stage upserts happen inside the same tx. Never nest `$transaction` calls.
