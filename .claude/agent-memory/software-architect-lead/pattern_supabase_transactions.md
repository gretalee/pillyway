---
name: "Supabase transaction strategy"
description: "How to do atomic multi-step writes when using the Supabase JS client in NestJS"
type: project
---

The Supabase JS client (`@supabase/supabase-js`) has no transaction API. Sequential `.from(...).insert(...)` calls are NOT atomic.

**Decision**: Use a `plpgsql` PostgreSQL function exposed as a Supabase RPC (`supabase.rpc(...)`) for any multi-step write that must be atomic. The function runs inside an implicit transaction and rolls back on any error.

**Why:** Established in PILLY-CAM-001 architecture review (2026-04-30). A raw `pg` client was rejected because it adds a second connection pool and separate env vars alongside the existing `SupabaseService`.

**How to apply:**
- Multi-step writes (create + link + order) → Supabase RPC wrapping a pg function
- The pg function must be `SECURITY DEFINER` when the caller is the anon/service role and the tables have RLS write policies that would otherwise block it
- Error strings from `RAISE EXCEPTION` (e.g. `'CAMINO_NAME_EXISTS'`) are caught in the NestJS service and mapped to the appropriate NestJS exception class (`ConflictException`, `BadRequestException`, etc.)
- The migration file creates the RPC function in the same SQL file as the tables it touches
