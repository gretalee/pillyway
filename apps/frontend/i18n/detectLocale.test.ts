import { describe, it, expect } from 'vitest';
import { resolveLocale } from './detectLocale';

describe('resolveLocale — cookie takes precedence', () => {
  it('returns "de" when raw value is "de"', () => {
    expect(resolveLocale('de')).toBe('de');
  });

  it('returns "en" when raw value is "en"', () => {
    expect(resolveLocale('en')).toBe('en');
  });

  it('cookie value is case-insensitive: "DE" resolves to "de"', () => {
    expect(resolveLocale('DE')).toBe('de');
  });
});

describe('resolveLocale — Accept-Language header fallback', () => {
  it('returns "en" for Accept-Language value "en-US,en;q=0.9"', () => {
    // The function receives the full header string from middleware.
    // split('-')[0] on "en-US,en;q=0.9" yields "en" — supported locale.
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en');
  });

  it('returns "de" for Accept-Language value "de-AT,de;q=0.9"', () => {
    expect(resolveLocale('de-AT,de;q=0.9')).toBe('de');
  });

  it('returns "de" for Accept-Language value "de" (exact match)', () => {
    expect(resolveLocale('de')).toBe('de');
  });

  it('returns "en" for Accept-Language value "en"', () => {
    expect(resolveLocale('en')).toBe('en');
  });

  it('returns "de" for Accept-Language value "fr-FR,fr;q=0.9"', () => {
    expect(resolveLocale('fr-FR,fr;q=0.9')).toBe('de');
  });

  it('returns "de" for Accept-Language value "*"', () => {
    expect(resolveLocale('*')).toBe('de');
  });
});

describe('resolveLocale — unknown / invalid values fall back to "de"', () => {
  it('returns "de" for an unrecognised locale string "fr"', () => {
    expect(resolveLocale('fr')).toBe('de');
  });

  it('returns "de" for an empty string ""', () => {
    expect(resolveLocale('')).toBe('de');
  });

  it('returns "de" for a cookie value of "fr" (invalid stored preference)', () => {
    expect(resolveLocale('fr')).toBe('de');
  });

  it('returns "de" for a value with a valid prefix but invalid suffix "de!nk"', () => {
    // "de!nk".split('-')[0] === "de!nk" — does not match allowlist, falls back.
    expect(resolveLocale('de!nk')).toBe('de');
  });
});

describe('resolveLocale — no input defaults to "de"', () => {
  it('returns "de" when called with undefined', () => {
    expect(resolveLocale(undefined)).toBe('de');
  });

  it('returns "de" when called with null (defensive)', () => {
    expect(resolveLocale(null)).toBe('de');
  });
});
