---
name: feature-event-tracking
description: Backend event tracking system — PILLY-EVT-001: user_events table, EventLogModule, integration points, Metabase-ready schema, no frontend tracking or cookies
type: project
---

Ticket PILLY-EVT-001 defines the first backend event tracking feature.

**Why:** PO wants product analytics in Metabase (DAU, content growth, engagement) with no external SaaS dependency, no cookies, and no client-side scripts.

**How to apply:** Reference these decisions in any ticket that touches event emission, the user_events table, or adds new event types.

## Architecture decision

- Dedicated `EventLogModule` with a single `EventLogService` that exposes a fire-and-forget `logEvent(event: EventType, userId: string | null, payload: Record<string, unknown>): void` method.
- The service writes directly via `PrismaService`. The call is intentionally non-awaited (void) at the call site — a logging failure must never interrupt the primary operation.
- Injected into: `CaminosModule`, `CaminoVotesModule`, `CaminoPicturesModule`, `WaypointsModule`, `AccommodationsModule`, `SightsModule`, and a new `AuthModule`.
- `EventLogModule` imports only `PrismaModule` and is global (`@Global`) so other modules do not need to re-import it.

## Table: user_events

Columns: id (UUID PK), event_type (VARCHAR), user_id (VARCHAR nullable), payload (JSONB), occurred_at (TIMESTAMPTZ).
Indexes: (event_type), (user_id), (occurred_at DESC).

## Event types and payload shape

- camino_created: { camino_id, camino_name }
- camino_updated: { camino_id, camino_name, changed_fields: string[] }
- camino_voted: { camino_id, vote: boolean }
- camino_image_uploaded: { camino_id, picture_id, is_primary: boolean }
- accommodation_created: { accommodation_id, camino_point_id, accommodation_name }
- accommodation_updated: { accommodation_id, camino_point_id, changed_fields: string[] }
- sight_created: { sight_id, camino_point_id, sight_name }
- sight_updated: { sight_id, camino_point_id, changed_fields: string[] }


No `KINDE_WEBHOOK_SECRET` env var is required.

## Out of scope (explicit decisions)

- No frontend event tracking of any kind
- No cookies
- No third-party analytics service (Segment, Amplitude, etc.)
- No event queue or message broker
- No admin API for querying events (Metabase queries the DB directly)
- No event replay or backfill
- No camino deletion event (not in the requested list)

## Open questions (as of ticket creation 2026-06-08)

1. Should `user_id` be the Kinde `sub` claim (opaque ID) or the user's email? Decision: use Kinde `sub` (opaque ID) for privacy and consistency with other tables.
2. Should `logEvent` swallow errors silently or log them to the NestJS logger? Decision proposed: catch internally, write to NestJS Logger at WARN level, never re-throw.
3. Should the `users` table store any profile fields beyond `kinde_user_id` (e.g. email, display name)? If so, should `POST /api/auth/session` sync them from the JWT claims on every call?
