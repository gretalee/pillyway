---
name: "Pillyway domain model"
description: "What Pillyway is, its core entities, and user roles — foundational context for all backend work"
type: project
---

Pillyway is a pilgrimage route planning app. Users discover routes, stages, and accommodations; logged-in users review them; Route Editors manage route data.

**Why:** Understanding the domain prevents mismodeling entities (e.g., treating Stage as a top-level resource independent of Route, or conflating Accommodation reviews with Route reviews).

**How to apply:** Every new API endpoint, DTO, and database entity should map cleanly to one of the core domain entities below. Authorization guards must enforce the role matrix.

## Core Entities
- **Route** — named pilgrimage route with metadata (name, description, origin, destination, total distance)
- **Stage** — ordered leg of a Route (sequence index, distance, duration, start/end point)
- **Accommodation** — lodging linked to a Stage or geographic location
- **Review** — user-authored rating + text body, polymorphic: attached to a Route OR an Accommodation
- **User** — authenticated user with a role

## User Roles
| Role | Default | Permissions |
|---|---|---|
| Guest (unauthenticated) | — | Read routes, stages, accommodations |
| Reviewer | Yes (all new users) | + Create reviews |
| Route Editor | Assigned | + Create / edit routes, stages, accommodations |

## Planned (later phase)
- Personal route composition: authenticated users can assemble a custom route from existing stages
