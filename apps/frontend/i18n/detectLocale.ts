export type Locale = 'de' | 'en';

const SUPPORTED_LOCALES = ['de', 'en'] as const;
const DEFAULT_LOCALE: Locale = 'de';

/**
 * Resolves a raw locale string (from a cookie value or Accept-Language header)
 * to a supported locale. Normalises by lowercasing and stripping subtags
 * (e.g. "en-US" → "en"). Falls back to German for unrecognised values.
 *
 * The function is a pure named export so it can be unit-tested independently
 * from the next-intl server config wiring.
 */
export function resolveLocale(raw: string | undefined | null): Locale {
  if (!raw || raw.trim() === '' || raw === '*') {
    return DEFAULT_LOCALE;
  }

  // Strip subtag and normalise: "en-US" → "en", "de-AT" → "de", "DE" → "de"
  const normalised = raw.toLowerCase().split('-')[0];

  // Guard against malformed values that happen to have a valid prefix
  // but contain invalid characters after the split (e.g. "de!nk" → "de!nk").
  // The split on '-' already handles standard subtags; additional chars after
  // non-hyphen separators are not stripped — they will simply fail the
  // allowlist check below.
  if ((SUPPORTED_LOCALES as readonly string[]).includes(normalised)) {
    return normalised as Locale;
  }

  return DEFAULT_LOCALE;
}
