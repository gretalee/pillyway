export type Locale = 'de' | 'en';

export const SUPPORTED_LOCALES = ['de', 'en'] as const;
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

  // Accept-Language headers may contain multiple language-ranges and
  // quality values, e.g. "en-US,en;q=0.9" or "de,de;q=0.9".
  // Extract the first language-range, remove any parameters, then strip
  // the locale subtag: "en-US,en;q=0.9" → "en", "DE,de;q=0.9" → "de".
  const firstLanguageRange = raw.toLowerCase().split(',')[0]?.trim() ?? '';
  const languageTag = firstLanguageRange.split(';')[0]?.trim() ?? '';
  const normalised = languageTag.split('-')[0];

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
