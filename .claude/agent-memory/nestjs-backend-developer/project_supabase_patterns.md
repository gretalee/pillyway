---
name: "Supabase patterns in Pillyway backend"
description: "How SupabaseService is used, query chain ordering, RPC pattern, and test mocking approach"
type: project
---

## SupabaseService
- Wraps `createClient` with `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS
- `client` property is public (`readonly`) — services access it via `this.supabase.client`
- `SupabaseModule` is `@Global()` so it need not be imported in every feature module

## Query chain order (important for TypeScript types)
Apply filters (`.ilike()`, `.eq()`) BEFORE `.limit()` and `.order()`. The Supabase JS SDK's `PostgrestFilterBuilder` (returned by `.select()`) has filter methods; `PostgrestTransformBuilder` (returned by `.limit()` / `.order()`) does not. Calling `.ilike()` after `.limit()` is a type error.

Correct pattern:
```typescript
let query = supabase.client.from('table').select('cols');
if (filterA) query = query.ilike('col', `%${val}%`);
if (filterB) query = query.eq('other', val);
const { data, error } = await query.limit(n).order('col');
```

## RPC pattern for atomic writes
Use `supabase.client.rpc('function_name', { p_param: value })` for multi-table writes.
RPC errors surface as `error.message` strings containing the RAISE EXCEPTION message from PL/pgSQL.
Map these in the service:
- `CAMINO_NAME_EXISTS` → `ConflictException`
- `CAMINO_POINT_NOT_FOUND:<uuid>` → `BadRequestException`
- `DUPLICATE_POINT_IN_REQUEST` → `BadRequestException`
- Anything else → `InternalServerErrorException` (log with `Logger.error`)

## Mocking in Vitest unit tests
Use a Proxy-based stub that accepts any method chain and resolves with the stubbed result when awaited. This avoids enumerating all Supabase query builder methods:

```typescript
function makeQueryStub(result: { data: unknown; error: unknown }): object {
  function makeProxy(): object {
    return new Proxy({}, {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve, _reject) => resolve(result);
        }
        return (..._args) => makeProxy();
      },
    });
  }
  return makeProxy();
}
// Usage: buildModule({ from: () => makeQueryStub({ data: [...], error: null }) })
```

For `.rpc()` calls, `vi.fn().mockResolvedValue(result)` is sufficient since rpc is a single call.
