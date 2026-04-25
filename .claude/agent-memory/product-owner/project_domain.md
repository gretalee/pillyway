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

## Domain Entities
Route → Stage → Accommodation → Review → User
