# PILLY-CAM-001 — Camino Creation: Architecture Review & Decisions

**Reviewer**: Software Architect Lead  
**Date**: 2026-04-30  
**Branch**: `feature/camino-creation`  
**Contract file**: `.claude/contracts/camino-creation-api.yaml`

---

## 1. Feasibility Verdict

The ticket is technically feasible within the existing stack. The core structural decisions — NestJS feature module, Supabase PostgreSQL, Kinde JWT + RolesGuard — are consistent with current patterns. Three non-trivial implementation decisions require explicit guidance before development begins; they are addressed in Section 3.

---

## 2. Pre-Implementation Prerequisite: Delete RoutesModule

`RoutesModule` is a placeholder stub that must be fully removed before `CaminosModule` is created. Failure to do this first creates a naming/import collision risk and leaves dead code in the tree.

**Files to delete:**
- `apps/backend/src/routes/routes.module.ts`
- `apps/backend/src/routes/routes.controller.ts`
- `apps/backend/src/routes/routes.service.ts`

**Files to update:**
- `apps/backend/src/app.module.ts` — remove `RoutesModule` import and declaration

This is a hard prerequisite for the backend agent. It must land in the first commit on the feature branch, before any Caminos code is written, so that the diff is clean and reviewable.

---

## 3. Architectural Decisions

### 3.1 Conditional DTO Validation — XOR on CaminoPoint Items

**Problem**: Each element in `caminoPoints` is either `{ caminoPointId }` (existing ref) or `{ name, country, description? }` (new definition). `class-validator` has no built-in `@XOR` decorator. Using a plain union DTO with both fields optional would silently accept malformed inputs that contain both or neither.

**Decision: Custom `@ValidateCaminoPointItem()` class-level decorator using `@ValidatorConstraint`.**

Implementation pattern:

```typescript
// dto/camino-point-item.dto.ts
import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'xorCaminoPointItem', async: false })
export class XorCaminoPointItemConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const hasRef = obj['caminoPointId'] !== undefined;
    const hasDef = obj['name'] !== undefined || obj['country'] !== undefined;
    // XOR: exactly one branch must be present
    return hasRef !== hasDef;
  }

  defaultMessage(): string {
    return 'Each caminoPoint must be either an existing-point ref ({ caminoPointId }) or a new-point definition ({ name, country, description? }), never both and never neither.';
  }
}

export function ValidateCaminoPointItem() {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      validator: XorCaminoPointItemConstraint,
    });
  };
}
```

The array item DTO carries all fields as optional at the type level, but the custom class-level constraint enforces the XOR at runtime:

```typescript
export class CaminoPointItemDto {
  @ValidateCaminoPointItem()
  @IsOptional() // suppresses the constraint default — XOR validator takes over
  _xor?: never; // phantom field to attach the class-level decorator

  @IsUUID()
  @IsOptional()
  caminoPointId?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  country?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;
}
```

> Note: The global `ValidationPipe` has `whitelist: true, forbidNonWhitelisted: true`, which strips unknown fields before the validator runs. This means a payload with BOTH `caminoPointId` and `name` will NOT be silently stripped — `caminoPointId` is a whitelisted field, so both survive to the XOR check and produce a 400. This is the correct behaviour.

The outer `CreateCaminoDto` uses `@ValidateNested({ each: true })` and `@Type(() => CaminoPointItemDto)` on the `caminoPoints` array.

---

### 3.2 Transaction Strategy for POST /api/caminos

**Problem**: The Supabase JS client (`@supabase/supabase-js`) does not expose a transaction API. The `SupabaseService` currently wraps `createClient` with the service-role key. A multi-step write (insert camino → upsert points → insert order rows) executed as separate client calls is NOT atomic: a mid-sequence crash leaves the database in a partially written state.

**Decision: Supabase RPC wrapping a PostgreSQL function.**

Create a single `plpgsql` function in the database and call it via `supabase.rpc(...)`. The function runs inside an implicit transaction and rolls back atomically on any error.

**Migration file**: `supabase/migrations/<timestamp>_camino_creation.sql`

Pseudocode for the pg function (the backend agent must implement the full SQL):

```sql
CREATE OR REPLACE FUNCTION create_camino(
  p_name        TEXT,
  p_description TEXT,
  p_created_by  TEXT,  -- Kinde user sub
  p_points      JSONB  -- array of point definitions
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_camino_id UUID;
  v_point     JSONB;
  v_point_id  UUID;
  v_position  INT := 1;
  v_result    JSONB;
BEGIN
  -- 1. Guard: camino name uniqueness (case-insensitive)
  IF EXISTS (SELECT 1 FROM caminos WHERE lower(name) = lower(p_name)) THEN
    RAISE EXCEPTION 'CAMINO_NAME_EXISTS';
  END IF;

  -- 2. Insert camino
  INSERT INTO caminos (name, description, verified, created_by)
  VALUES (p_name, p_description, false, p_created_by)
  RETURNING id INTO v_camino_id;

  -- 3. For each point: upsert camino_points, then insert order row
  FOR v_point IN SELECT * FROM jsonb_array_elements(p_points)
  LOOP
    IF v_point ? 'caminoPointId' THEN
      v_point_id := (v_point->>'caminoPointId')::UUID;
      -- Verify the referenced point exists
      IF NOT EXISTS (SELECT 1 FROM camino_points WHERE id = v_point_id) THEN
        RAISE EXCEPTION 'CAMINO_POINT_NOT_FOUND:%', v_point_id;
      END IF;
    ELSE
      -- Upsert on unique (name, country) — handles concurrent creation gracefully
      INSERT INTO camino_points (name, country, description)
      VALUES (
        v_point->>'name',
        v_point->>'country',
        v_point->>'description'
      )
      ON CONFLICT (name, country) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO v_point_id;
    END IF;

    INSERT INTO camino_point_order (camino_id, camino_point_id, position)
    VALUES (v_camino_id, v_point_id, v_position);

    v_position := v_position + 1;
  END LOOP;

  -- 4. Build and return full result as JSONB
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'verified', c.verified,
    'caminoPoints', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', cp.id,
          'name', cp.name,
          'country', cp.country,
          'position', cpo.position
        ) ORDER BY cpo.position
      )
      FROM camino_point_order cpo
      JOIN camino_points cp ON cp.id = cpo.camino_point_id
      WHERE cpo.camino_id = c.id
    )
  )
  INTO v_result
  FROM caminos c
  WHERE c.id = v_camino_id;

  RETURN v_result;
END;
$$;
```

The NestJS service catches `CAMINO_NAME_EXISTS` and maps it to `ConflictException`. It catches `CAMINO_POINT_NOT_FOUND:*` and maps it to `BadRequestException`.

**Why not raw pg via `pg` npm package?** Adding a direct `pg` client alongside the Supabase client introduces a second connection pool with separate env vars (`DATABASE_URL`) and different connection semantics. The RPC approach is lower friction, uses existing `SupabaseService`, and keeps the service-role connection as the single point of access. If the team later needs complex multi-statement transactions that outgrow RPC, migrating to `@nestjs/typeorm` or `Prisma` is a clean, bounded refactor.

**Why not Supabase Edge Functions?** Out of scope, adds deployment complexity, and the NestJS service layer already owns business logic.

---

### 3.3 Module Placement: GET /api/countries

**Decision: A dedicated `CountriesModule` (thin — controller + static data, no DB dependency).**

Rationale:
- `GET /api/countries` is a cross-cutting concern. It will be consumed by both the Camino creation form (for point country selection) and, likely, any future filtering UI on the browse page.
- Placing it inside `CaminosModule` creates an implicit dependency: if `CaminosModule` is ever split or the browse feature is extracted, the countries endpoint moves with it unexpectedly.
- The module is trivial: one controller, no service needed beyond returning a constant. Cost is essentially zero.

Implementation: maintain the country list as a `COUNTRIES` constant in `src/countries/countries.constants.ts` (a sorted string array). The controller returns it directly. No database round-trip — this list changes only via a deploy.

If the list ever needs to be database-driven (e.g., admin-managed), the module boundary is already correct and only the controller implementation changes.

---

### 3.4 Row-Level Security (RLS) for Supabase Tables

**Context**: The backend uses `createClient` with `SUPABASE_SERVICE_ROLE_KEY`. The service-role key bypasses RLS entirely. This means RLS on these tables is effectively enforced only for any future direct Supabase client calls from the frontend (e.g., if a Supabase realtime subscription is added later).

**Decision: Enable RLS on all three tables with the following policies, even though the current backend bypasses them.**

Rationale: defence-in-depth. If a developer accidentally uses the anon key, or if the frontend ever queries Supabase directly, the policies catch unauthorised access.

```sql
-- caminos: public read, no direct write from client
ALTER TABLE caminos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "caminos_public_read"
  ON caminos FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policy from client — all writes go through service role via NestJS

-- camino_points: public read, no direct write
ALTER TABLE camino_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camino_points_public_read"
  ON camino_points FOR SELECT USING (true);

-- camino_point_order: public read, no direct write
ALTER TABLE camino_point_order ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camino_point_order_public_read"
  ON camino_point_order FOR SELECT USING (true);
```

No client-side write policy is defined. Any write attempted with the anon key is rejected by RLS. Writes only succeed through the NestJS backend using the service-role key.

**The `create_camino` pg function must be created with `SECURITY DEFINER`** so it executes under the role of the function owner (postgres/superuser), not the calling role. This is required for the RPC call to succeed when the function performs inserts that are not covered by the anon-key write policies.

---

## 4. Schema Notes

The migration should be written in a single file that creates the tables, unique constraints, composite PK, indexes, RLS policies, and the `create_camino` RPC function in dependency order.

**Recommended index additions** beyond what the ticket specifies:

| Table | Index | Reason |
|---|---|---|
| `caminos` | `LOWER(name)` functional index | Powers the case-insensitive 409 guard cheaply |
| `camino_points` | `LOWER(name) text_pattern_ops` | Powers ILIKE search without full-table scan |
| `camino_points` | `(name, country)` UNIQUE | Already required by ticket |
| `camino_point_order` | `(camino_id, position)` | Powers ordered point retrieval |

---

## 5. Role Name: `pilgrim` vs Existing `Route Editor`

**Risk**: The ticket specifies the role key `pilgrim` for `POST /api/caminos`. The existing CLAUDE.md domain model defines roles as `Reviewer` and `Route Editor`. The `KindeJwtStrategy` reads `roles[].key` from the JWT.

**Action required before implementation**: Confirm with the product owner whether `pilgrim` is the Kinde role key that maps to what CLAUDE.md calls `Route Editor`, or whether this is a brand-new third role. The backend agent must use the exact string that Kinde emits in the JWT `roles` claim — using the wrong string means the guard always returns 403 in production even with a valid token.

If `pilgrim` is confirmed as the Kinde key for the route-creation role, update CLAUDE.md's role table to reflect the Kinde key alongside the display name.

---

## 6. Risks & Flags

### RISK-01 — XOR validation gap (HIGH)
`class-validator` has no native XOR support. If the backend developer uses a naive DTO with all fields optional and `@IsOptional()` on everything, the API will silently accept structurally invalid payloads. The custom `@ValidatorConstraint` pattern in Section 3.1 must be implemented, not skipped.

### RISK-02 — Non-atomic write without RPC (HIGH)
If the backend developer implements the `POST /api/caminos` handler using sequential Supabase JS client calls instead of the RPC function, the operation is not atomic. A server crash between the camino insert and the point-order inserts leaves orphaned rows. The RPC/pg-function approach in Section 3.2 is mandatory.

### RISK-03 — Role key string mismatch (HIGH)
See Section 5. The `RolesGuard` does an exact string match on `role.key`. A mismatch produces silent 403 failures in production. This must be verified against the actual Kinde dashboard configuration before the endpoint goes live.

### RISK-04 — CORS in production (MEDIUM)
`main.ts` calls `app.enableCors()` with no origin restriction. Before the feature goes to production, CORS should be locked to the frontend origin via `ConfigService`. This is not specific to this feature but should be addressed in this PR since it is the first public-facing write endpoint.

### RISK-05 — Missing `created_by` propagation (MEDIUM)
The `caminos` table includes `created_by` (the Kinde user `sub`). The ticket spec for `POST /api/caminos` response does not include it, which is correct. However, the NestJS service must extract `req.user.sub` from the JWT payload and pass it into the RPC call. If the developer forgets this, all caminos are created with a null `created_by`, losing the audit trail. The `created_by` column should be `NOT NULL` in the migration to make this a hard compile-time catch rather than a silent data quality issue.

### RISK-06 — Camino point search with no parameters (LOW)
The ticket does not specify behaviour when `GET /api/camino-points/search` is called with neither `name` nor `country`. The spec (Section in API YAML) defines it as returning an empty array. The backend developer must implement this guard explicitly — an unparameterised ILIKE `%%` query returns the entire table and triggers a full scan. Add a guard: if both params are absent, short-circuit and return `[]` without hitting the DB.

### RISK-07 — `verified` field writability (LOW)
`verified` defaults to `false` on creation and is not in the request body, which is correct. Confirm that no future API path allows a non-admin user to set `verified = true` directly. The RPC function should hardcode `verified = false` on insert (as shown in Section 3.2) rather than accepting it as a parameter.

---

## 7. Module Structure (Guidance for Backend Agent)

```
apps/backend/src/
├── app.module.ts                    ← remove RoutesModule, add CaminosModule + CountriesModule
├── caminos/
│   ├── caminos.module.ts
│   ├── caminos.controller.ts        ← GET /api/caminos, POST /api/caminos
│   ├── caminos.service.ts
│   └── dto/
│       ├── create-camino.dto.ts
│       └── camino-point-item.dto.ts ← XOR validator lives here
├── camino-points/
│   ├── camino-points.module.ts
│   ├── camino-points.controller.ts  ← GET /api/camino-points/search
│   └── camino-points.service.ts
└── countries/
    ├── countries.module.ts
    ├── countries.controller.ts      ← GET /api/countries
    └── countries.constants.ts
```

`CaminosModule` and `CaminoPointsModule` both import `AuthModule`. `CountriesModule` does not (public endpoint, no guards needed).

---

## 8. Frontend Agent Guidance

- The `GET /api/countries` response drives the country `<select>` in the new-point form. Fetch it once on page load via TanStack Query with a long `staleTime` (it changes only on deploy).
- The `GET /api/camino-points/search` endpoint is used for the typeahead/search-as-you-type UX on the point picker. Debounce the query by 300 ms and set `minLength: 2` before firing — this protects the backend from keystroke-level traffic.
- The `POST /api/caminos` form must send the Kinde JWT in the `Authorization: Bearer <token>` header. Confirm the auth SDK exposes a method to retrieve the current access token client-side.
- `caminoPoints` array ordering is significant — the position index (0-based array index) becomes the stored `position` (1-based). The frontend must preserve insertion order and allow drag-to-reorder before submit.

---

## 9. Definition of Done (DoD)

- [ ] `RoutesModule` deleted and removed from `AppModule`
- [ ] `GET /api/caminos` returns 200 with correct shape (empty array when no data)
- [ ] `POST /api/caminos` with valid JWT + `pilgrim` role creates camino atomically and returns 201
- [ ] `POST /api/caminos` with mixed existing/new points upserts correctly (no duplicate camino_points rows)
- [ ] `POST /api/caminos` with payload containing both `caminoPointId` AND `name` returns 400
- [ ] `POST /api/caminos` with payload containing neither returns 400
- [ ] `POST /api/caminos` with no JWT returns 401
- [ ] `POST /api/caminos` with JWT but wrong role returns 403
- [ ] `POST /api/caminos` with duplicate camino name returns 409
- [ ] `GET /api/camino-points/search?name=saint` returns max 5 results, case-insensitive
- [ ] `GET /api/camino-points/search` (no params) returns empty array without DB query
- [ ] `GET /api/countries` returns sorted string array
- [ ] Supabase migration: all 3 tables created, RLS enabled, `create_camino` RPC created with SECURITY DEFINER
- [ ] `LOWER(name)` functional index on `caminos` exists
- [ ] `caminos.created_by` is NOT NULL
- [ ] CORS origin locked to frontend URL via `ConfigService` before PR merge
- [ ] All NestJS unit tests for the service layer pass
- [ ] E2E test covers the happy path and the 409 conflict case
