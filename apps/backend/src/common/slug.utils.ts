/**
 * Character transliteration map.
 * Apply to a lowercased string before stripping non-ASCII characters.
 * Multi-character expansions (ü→ue, ß→ss) come first; single-char
 * diacritics follow so they don't conflict with the expansions above.
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  // German expansions (must precede simple vowel mappings)
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',

  // Scandinavian
  å: 'aa',
  ø: 'o',
  æ: 'ae',

  // Ligatures / digraphs
  œ: 'oe',
  ﬁ: 'fi',
  ﬂ: 'fl',

  // Icelandic
  þ: 'th',
  ð: 'd',

  // French / Romance accented vowels
  à: 'a',
  á: 'a',
  â: 'a',
  ã: 'a',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  ò: 'o',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ù: 'u',
  ú: 'u',
  û: 'u',
  ý: 'y',
  ÿ: 'y',
  ç: 'c',
  ñ: 'n',

  // Slavic / Czech / Slovak / Croatian
  č: 'c',
  š: 's',
  ž: 'z',
  ř: 'r',
  ů: 'u',
  ě: 'e',
  ď: 'd',
  ť: 't',
  ľ: 'l',
  ĺ: 'l',
  ŕ: 'r',

  // Polish
  ł: 'l',
  ą: 'a',
  ę: 'e',
  ś: 's',
  ź: 'z',
  ż: 'z',
  ć: 'c',
  ń: 'n',

  // Turkish
  ğ: 'g',
  ş: 's',
  ı: 'i',
};

/**
 * Converts a display name to a URL-safe slug:
 *   1. Lowercase
 *   2. Transliterate special characters (ü→ue, é→e, ß→ss, …)
 *   3. Replace whitespace / underscores with hyphens
 *   4. Strip any remaining non-alphanumeric, non-hyphen characters
 *   5. Collapse and trim leading/trailing hyphens
 */
export function slugify(name: string): string {
  const lower = name.toLowerCase().trim();

  const transliterated = lower
    .split('')
    .map((ch) => TRANSLITERATION_MAP[ch] ?? ch)
    .join('');

  return transliterated
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
