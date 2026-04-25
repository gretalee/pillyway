---
name: "Pillyway domain model"
description: "What Pillyway is and its authorization model — critical context for security validation"
type: project
---

Pillyway is a pilgrimage route planning app with three effective access levels: Guest, Reviewer (default for all new users), and Route Editor (assigned).

**Why:** Authorization bugs are the primary risk surface. Knowing the intended role model lets the validator catch privilege escalation issues — e.g., a Guest submitting a review, or a Reviewer editing a route.

**How to apply:** For every feature reviewed, verify that:
1. Unauthenticated requests cannot trigger write operations (reviews, route edits)
2. Reviewer-role users cannot access Route Editor endpoints
3. Role assignment cannot be self-elevated by the user

## Write Permission Matrix
| Action | Guest | Reviewer | Route Editor |
|---|---|---|---|
| Read routes / stages / accommodations | ✓ | ✓ | ✓ |
| Create / edit review | ✗ | ✓ | ✓ |
| Create / edit route, stage, accommodation | ✗ | ✗ | ✓ |
