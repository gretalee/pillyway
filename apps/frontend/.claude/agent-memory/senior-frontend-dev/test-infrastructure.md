---
name: Test Infrastructure
description: Vitest + RTL setup, co-location convention, and module mock patterns discovered while writing PILLY-VER-001 tests
type: project
---

## Test runner
- Vitest 4, jsdom environment, `globals: true`
- Setup file: `vitest.setup.ts` — imports `@testing-library/jest-dom` only
- Config: `vitest.config.ts` — uses `vite-tsconfig-paths` so `@/` alias resolves in tests

## Co-location convention
Test files sit next to the source file they test (e.g. `toggle-switch.test.tsx` next to `toggle-switch.tsx`). No separate `__tests__` directory.

## Standard mock patterns

### next-intl
```ts
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ dateTime: (d: Date) => d.toISOString().slice(0, 10) }),
}));
```

### next/link
```ts
vi.mock('next/link', () => ({
  default: ({ href, children, className }) => <a href={href} className={className}>{children}</a>,
}));
```

### Kinde
```ts
vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: vi.fn(),   // or () => ({ accessTokenEncoded: 'token' })
}));
```

### @base-ui/react Switch
The Switch.Root renders as `<button role="switch" aria-checked={checked}>` in tests. Thumb renders null. This lets userEvent.click() and aria-checked assertions work correctly.

### @base-ui/react Dialog
The Dialog.Root conditionally renders children only when `open=true`. Popup renders as `<div role="dialog">`. Close button passes aria-label through.

### @base-ui/react Tooltip
The Tooltip.Trigger renders as a button that receives aria-label. Portal/Positioner/Popup mount in the document on focus.

## Zustand store reset pattern
```ts
function resetStore() {
  useModalStore.setState({ modals: {} });
}
beforeEach(() => resetStore());
```

## TanStack Query hook test pattern
Each test creates its own `QueryClient` with `retry: false, staleTime: 0` inside a `makeWrapper()` factory. The underlying fetch function is mocked via `vi.mock` at module level, then `vi.mocked(fn).mockResolvedValueOnce(...)` per test.

**Why:** isolates cache state between tests; prevents stale-time from suppressing refetches.
