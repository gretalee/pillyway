---
name: "Pillyway domain model"
description: "What Pillyway is, its features, and user roles — foundational context for writing tickets"
type: project
---

Pillyway is a pilgrimage route planning app.

**Why:** Knowing the product domain ensures tickets use correct terminology, target the right user roles, and don't accidentally scope features to the wrong phase.

**How to apply:** Every ticket must name the target user role (Guest / Reviewer / Route Editor), state which phase it belongs to (current vs. later), and reference the affected domain entity.

## Phases
**Phase 1 (current scope)**
- Browse routes, stages, accommodations (public)
- Authenticated users write reviews (Reviewer role)
- Route Editors manage route data via input forms

**Phase 2 (later)**
- Authenticated users compose a personal route from existing stages

## Domain Entities (canonical naming — use these terms in all tickets)
- **Camino** — a named pilgrimage route (the codebase and UI use "camino", not "route")
- **CaminoPoint** — a village/city waypoint on a camino (not "stage")
- **CaminoStage** — the leg between two CaminoPoints (planned, not yet implemented)
- **Accommodation** — lodging linked to a CaminoPoint
- **Sight** — point of interest linked to a CaminoPoint
- **Review** — user-authored rating + text, attached to a Camino or Accommodation
- **User** — authenticated user with a Kinde role

## User Roles (Kinde role keys)
- `owner` — admin/backoffice access (already in header logic)
- `reviewer` — default for new users; can write reviews
- `pilgrim` — can create and manage caminos via input forms (replaces "Route Editor" from CLAUDE.md)

Note: CLAUDE.md still uses "Route / Stage / Route Editor" terminology — the codebase and product have since adopted "Camino / CaminoPoint / pilgrim". Tickets should use the codebase terms.
