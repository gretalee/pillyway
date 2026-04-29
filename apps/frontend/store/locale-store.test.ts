import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';

// Reset store and cookie state between tests.
afterEach(() => {
  // Clear the cookie that setLocale writes so tests don't bleed.
  document.cookie = 'pillyway-locale=; max-age=0; path=/';

  // Reset the store to its initial state so each test gets a clean slate.
  vi.resetModules();
});

describe('useLocaleStore — initial state', () => {
  it('initial locale is "de"', async () => {
    const { useLocaleStore } = await import('./locale-store');
    expect(useLocaleStore.getState().locale).toBe('de');
  });

  it('initial setLocale is a function', async () => {
    const { useLocaleStore } = await import('./locale-store');
    expect(typeof useLocaleStore.getState().setLocale).toBe('function');
  });
});

describe('useLocaleStore — setLocale state update', () => {
  it('setLocale("en") updates locale state to "en"', async () => {
    const { useLocaleStore } = await import('./locale-store');
    act(() => {
      useLocaleStore.getState().setLocale('en');
    });
    expect(useLocaleStore.getState().locale).toBe('en');
  });

  it('setLocale("de") updates locale state to "de"', async () => {
    const { useLocaleStore } = await import('./locale-store');
    // Switch to "en" first so we can verify the reverse direction.
    act(() => {
      useLocaleStore.getState().setLocale('en');
    });
    act(() => {
      useLocaleStore.getState().setLocale('de');
    });
    expect(useLocaleStore.getState().locale).toBe('de');
  });

  it('calling setLocale with the current value is idempotent — state remains unchanged', async () => {
    const { useLocaleStore } = await import('./locale-store');
    const before = useLocaleStore.getState().locale; // 'de'
    act(() => {
      useLocaleStore.getState().setLocale('de');
    });
    expect(useLocaleStore.getState().locale).toBe(before);
  });
});

// Helper: intercept document.cookie writes and collect the raw strings.
function spyCookieWrites(): { values: string[]; restore: () => void } {
  const values: string[] = [];

  // jsdom stores cookie on the document instance itself.
  // We intercept by patching the setter via Object.defineProperty on the instance.
  const proto = Object.getPrototypeOf(document);
  const descriptor =
    Object.getOwnPropertyDescriptor(document, 'cookie') ??
    Object.getOwnPropertyDescriptor(proto, 'cookie') ??
    Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

  if (!descriptor?.set) {
    throw new Error('Could not locate document.cookie setter');
  }

  const originalSet = descriptor.set;

  Object.defineProperty(document, 'cookie', {
    set(value: string) {
      values.push(value);
      originalSet.call(document, value);
    },
    get: descriptor.get,
    configurable: true,
  });

  return {
    values,
    restore() {
      Object.defineProperty(document, 'cookie', descriptor);
    },
  };
}

describe('useLocaleStore — setLocale cookie write', () => {
  it('setLocale("en") writes pillyway-locale=en to document.cookie', async () => {
    const { useLocaleStore } = await import('./locale-store');
    act(() => {
      useLocaleStore.getState().setLocale('en');
    });
    expect(document.cookie).toContain('pillyway-locale=en');
  });

  it('setLocale("de") writes pillyway-locale=de to document.cookie', async () => {
    const { useLocaleStore } = await import('./locale-store');
    act(() => {
      useLocaleStore.getState().setLocale('en');
    });
    act(() => {
      useLocaleStore.getState().setLocale('de');
    });
    expect(document.cookie).toContain('pillyway-locale=de');
  });

  it('cookie includes path=/', async () => {
    const spy = spyCookieWrites();
    const { useLocaleStore } = await import('./locale-store');
    act(() => {
      useLocaleStore.getState().setLocale('en');
    });
    spy.restore();
    const written = spy.values.find((v) => v.includes('pillyway-locale'));
    expect(written).toBeDefined();
    expect(written).toContain('path=/');
  });

  it('cookie includes SameSite=Lax attribute', async () => {
    const spy = spyCookieWrites();
    const { useLocaleStore } = await import('./locale-store');
    act(() => {
      useLocaleStore.getState().setLocale('en');
    });
    spy.restore();
    const written = spy.values.find((v) => v.includes('pillyway-locale'));
    expect(written).toBeDefined();
    expect(written).toContain('SameSite=Lax');
  });

  it('cookie includes max-age=31536000 (one year)', async () => {
    const spy = spyCookieWrites();
    const { useLocaleStore } = await import('./locale-store');
    act(() => {
      useLocaleStore.getState().setLocale('en');
    });
    spy.restore();
    const written = spy.values.find((v) => v.includes('pillyway-locale'));
    expect(written).toBeDefined();
    expect(written).toContain('max-age=31536000');
  });

  it('cookie does NOT include the Secure flag', async () => {
    const spy = spyCookieWrites();
    const { useLocaleStore } = await import('./locale-store');
    act(() => {
      useLocaleStore.getState().setLocale('en');
    });
    spy.restore();
    const written = spy.values.find((v) => v.includes('pillyway-locale'));
    expect(written).toBeDefined();
    // The string must not contain "Secure" (case-sensitive per RFC 6265).
    expect(written).not.toContain('Secure');
  });
});
