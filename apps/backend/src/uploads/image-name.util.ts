import { randomUUID } from 'crypto';

// German transliterations must run BEFORE the generic NFD diacritic strip
// below — NFD-stripping ö directly would collapse it to "o", losing the
// "oe" a German reader expects. Applied on the raw string first so the
// literal ö/ä/ü/ß characters are still intact to match against.
const GERMAN_TRANSLITERATIONS: [RegExp, string][] = [
  [/ä/g, 'ae'],
  [/ö/g, 'oe'],
  [/ü/g, 'ue'],
  [/ß/g, 'ss'],
  [/Ä/g, 'Ae'],
  [/Ö/g, 'Oe'],
  [/Ü/g, 'Ue'],
];

const MAX_SLUG_LENGTH = 80;

/**
 * Turns a user-supplied display name into a URL-/filesystem-safe slug
 * fragment for use in an S3 key filename: German umlauts transliterated
 * (ö -> oe, not stripped to o), any other diacritics stripped (é -> e,
 * à -> a, ...), lowercased, every run of non [a-z0-9] characters collapsed
 * to a single underscore, leading/trailing underscores trimmed.
 *
 * Returns '' if nothing usable survives (e.g. the name was only emoji or
 * symbols) — callers must fall back to a generated name in that case, see
 * buildImageFilename.
 */
export function slugifyImageName(name: string): string {
  let result = name;
  for (const [pattern, replacement] of GERMAN_TRANSLITERATIONS) {
    result = result.replace(pattern, replacement);
  }

  // Strips NFD combining diacritical marks (U+0300-U+036F) — what's left
  // of an accented character (é, à, ñ, ...) once NFD has split it into a
  // base letter plus a combining mark.
  const combiningDiacritics = new RegExp('[\\u0300-\\u036f]', 'g');

  return result
    .normalize('NFD')
    .replace(combiningDiacritics, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_SLUG_LENGTH);
}

/**
 * Builds a .webp S3 key filename (no directory prefix) from an optional
 * display name:
 *   - name given, sanitizes to something usable → `<slug>_<8-hex>.webp`.
 *     The suffix is always appended, even with a name — per the "always
 *     make it unique" decision, a caller-supplied name can never collide
 *     with (and silently overwrite) an existing image.
 *   - no name, or name sanitizes to '' → a bare `<uuid>.webp`, identical
 *     to the pre-naming-feature behaviour.
 *
 * The thumbnail naming convention (deriveThumbnailUrl in image-url.util.ts)
 * is unaffected either way — it only ever looks at the trailing `.webp`.
 */
export function buildImageFilename(name?: string | null): string {
  const slug = name ? slugifyImageName(name) : '';
  if (!slug) {
    return `${randomUUID()}.webp`;
  }
  const suffix = randomUUID().split('-')[0]; // 8 hex chars — short, still collision-resistant
  return `${slug}_${suffix}.webp`;
}
