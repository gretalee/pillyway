---
name: Pillyway POI (accommodation & sight) patterns
description: API layer structure, WaypointDetailView server/client split, edit-page guard pattern, and delete-dialog i18n approach for accommodation and sight features
type: project
---

## API Layer Structure

Accommodations and sights each have their own API directory:
- `apps/frontend/app/api/accommodations/` — accommodation-types.ts, fetch-accommodation.ts, use-accommodation.ts, use-accommodations-by-waypoint.ts, use-update-accommodation.ts, use-delete-accommodation.ts
- `apps/frontend/app/api/sights/` — sight-types.ts, fetch-sight.ts, use-sight.ts, use-sights-by-waypoint.ts, use-update-sight.ts, use-delete-sight.ts

Cache key conventions:
- `['accommodation', id]` — single accommodation
- `['accommodations', caminoPointId]` — all accommodations for a waypoint
- `['sight', id]` — single sight
- `['sights', caminoPointId]` — all sights for a waypoint

The `waypoint-types.ts` no longer embeds accommodation/sight data in WaypointDetail — data loads separately via dedicated hooks.

## WaypointDetailView Server/Client Split

WaypointDetail uses a two-component split:
- `WaypointDetailView` (async server component) — fetches translations from `getTranslations`, resolves country name, determines `canContribute`, passes pre-resolved string translations as props to the client component
- `WaypointDetailClient` ('use client') — holds `useRouter`, `useAccommodationsByWaypoint`, `useSightsByWaypoint`, delete dialog state

**Why:** `useRouter` and TanStack Query hooks require a client component boundary. Passing pre-resolved translations from server avoids calling `useTranslations` in the client for static strings, but delete dialogs handle their own `useTranslations` because they need dynamic `{name}` interpolation via next-intl.

## Delete Dialog Translation Approach

`DeleteAccommodationDialog` and `DeleteSightDialog` are `'use client'` and call `useTranslations('waypoint_detail')` directly. The `{name}` param is passed as a prop and interpolated by next-intl (`t('delete_confirmation_description', { name })`). Do NOT pass raw ICU strings from server to client — use `useTranslations` in the dialog component instead.

## Edit Page Auth Guard Pattern

Edit pages (accommodations/[id]/edit, sights/[id]/edit) follow this server component pattern:
1. `getAuthUser()` — if null, `redirect('/api/auth/login')`
2. Check `pilgrim` role only — if absent, `redirect(\`/waypoints/${slug}\`)`
3. `fetchAccommodation(id)` / `fetchSight(id)` — if 404, `notFound()`; other errors render inline error paragraph
4. Pass fetched data as `defaultValues` to the edit form

## Edit Form Image Removal

EditAccommodationForm and EditSightForm track:
- `removeImageUrls: string[]` — URLs of existing images the user clicked × on
- `newImageUrls: string[]` — URLs of newly uploaded images
- `visibleExistingImages` — derived: `accommodation.imageUrls.filter(url => !removeImageUrls.includes(url))`

On submit, include `removeImageUrls` in payload only if non-empty. Show `images_empty_state` text when `visibleExistingImages.length === 0`.

## Form Type Label Convention

Accommodation type and price range labels for `<select>` options come from `waypoint_detail.accommodation_type.*` and `waypoint_detail.price_range.*` namespaces — NOT from `accommodation_new`. The `accommodation_new` namespace only has field labels and error messages.

**How to apply:** When building forms that render accommodation type / price range dropdowns, use `useTranslations('waypoint_detail')` for option labels and `useTranslations('accommodation_new')` for field labels.
