---
name: "Pillyway domain model"
description: "What Pillyway is, its core entities, and user roles — foundational context for all frontend work"
type: project
---

Pillyway is a pilgrimage route planning app. Users discover routes, stages, and accommodations; logged-in users review them; Route Editors manage route data via dedicated input forms.

**Why:** Understanding the domain prevents wrong screen/navigation designs (e.g., hiding route browsing behind a login wall, or showing review forms to unauthenticated users).

**How to apply:** Screen access and UI affordances must match the role matrix. Review forms and the Route Editor forms are only rendered for authenticated users with the correct role.

## Core Entities
- **Route** — named pilgrimage route
- **Stage** — ordered leg of a Route
- **Accommodation** — lodging linked to a Stage or location
- **Review** — rating + text, attached to a Route or Accommodation (requires login)
- **User** — authenticated user with a role

## User Roles & UI Impact
| Role | UI Access |
|---|---|
| Guest | Browse routes, stages, accommodations; no review form |
| Reviewer (default) | + Review form for routes and accommodations |
| Route Editor | + Route/Stage/Accommodation creation and edit forms |

## Planned (later phase)
- Personal route builder: authenticated users compose a custom route from existing stages
