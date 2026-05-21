---
name: Kinde auth patterns in frontend client components
description: How to access userId, roles, and token in client components; time-windowed delete authorization
type: project
---

Kinde auth in client components comes from `useKindeBrowserClient()` imported from `@kinde-oss/kinde-auth-nextjs`.

**Why:** The frontend uses Kinde for auth. Server-side auth uses `getKindeServerSession` from `@kinde-oss/kinde-auth-nextjs/server`; client components use `useKindeBrowserClient`.

**How to apply:**
- `user.id` — current user's Kinde user ID (string)
- `accessToken?.roles` — array of `{ id, key, name }`; extract role keys with `.map((r) => r.key) ?? []`
- `accessTokenEncoded` — raw JWT string, used as `Authorization: Bearer <token>` in API fetch calls
- Roles on the access token may be undefined, so always use `?? []` fallback

Server-side: `getAuthUser()` in `lib/getAuthUser.ts` returns `AuthUser | null` with `id`, `email`, `roles: UserRole[]`.

**Delete authorization utility:**
`lib/can-delete.ts` encodes the time-windowed delete policy for all entities:
- `owner` role — always allowed
- Creator within window — allowed (camino: 2h, accommodation/sight: 1h)
- Anyone else — denied

Used in: `CaminoActionsMenu`, `DeleteAccommodationButton`, `DeleteSightButton`.
The delete button/menu-item is **hidden** (not disabled) when `canDelete` returns false.
