---
name: "Database access layer — migrated from Supabase to Prisma"
description: "Supabase JS client was replaced by Prisma 7 in the backend. PrismaModule is global. Old Supabase patterns are no longer applicable."
type: project
---

## Migration completed (2026-05-04)
Supabase JS client (`@supabase/supabase-js`) has been fully removed from the backend.
`SupabaseModule` / `SupabaseService` → replaced by `PrismaModule` / `PrismaService`.
The supabase/ source files were neutralised (empty exports) — they should be git-deleted.

## PrismaService
- Extends `PrismaClient`, implements `OnModuleInit` / `OnModuleDestroy` (connect/disconnect lifecycle).
- Lives in `src/prisma/prisma.service.ts`.
- `PrismaModule` is `@Global()` → injectable everywhere without per-feature-module imports.
- `@prisma/client` is in `dependencies`; `prisma` CLI is in `devDependencies`.
- `postinstall` script runs `prisma generate` so the client is always regenerated on `yarn install`.
- Prisma schema at `apps/backend/prisma/schema.prisma` — uses `DATABASE_URL` and `DIRECT_URL` env vars (not SUPABASE_* vars).

## Environment variables (backend)
- `DATABASE_URL` — Supavisor session-mode pooler (or local Supabase port 54322)
- `DIRECT_URL` — direct connection, bypasses pooler; required for `prisma migrate`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` removed entirely

## Error mapping in services
Previously RPC string-matching; now explicit application-level checks inside `$transaction`:
- Case-insensitive name check via `findFirst({ where: { name: { equals: ..., mode: 'insensitive' } } })` → `ConflictException`
- Duplicate new-point definitions (same lowercase name+country) detected before DB write → `BadRequestException`
- `findUnique` returning null for existing-point ref → `BadRequestException` with UUID in message
- Prisma `P2002` (unique constraint, race condition) in outer catch → `ConflictException`
- Any `HttpException` thrown inside the transaction callback is re-thrown as-is from the outer catch
- Anything else → `InternalServerErrorException`

## Mocking in Vitest unit tests
Supabase Proxy stub is gone. Prisma mocking is straightforward:

**For $transaction:**
```typescript
const tx = {
  camino: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({...}) },
  caminoPoint: { findUnique: vi.fn(), upsert: vi.fn().mockResolvedValue({...}) },
  caminoPointOrder: { create: vi.fn().mockResolvedValue({}) },
};
const prismaMock = {
  $transaction: vi.fn().mockImplementation((cb) => cb(tx)),
};
```

**For findMany (CaminoPointsService):**
```typescript
const findManyMock = vi.fn().mockResolvedValue(records);
{ provide: PrismaService, useValue: { caminoPoint: { findMany: findManyMock } } }
```

**For P2002 test:** use `const { Prisma } = await import('@prisma/client')` then `new Prisma.PrismaClientKnownRequestError(...)` — do NOT import from `@prisma/client/runtime/library` (private API).

## Prisma scripts
```json
"prisma:generate": "prisma generate",
"prisma:migrate:dev": "prisma migrate dev",
"prisma:migrate:deploy": "prisma migrate deploy",
"prisma:studio": "prisma studio"
```
