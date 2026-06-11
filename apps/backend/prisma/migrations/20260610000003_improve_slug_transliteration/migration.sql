-- Re-generate slugs using proper transliteration (ü→ue, ß→ss, é→e, etc.).
--
-- camino_points: their slugs were generated one-at-a-time with uniqueness
-- checking, so we only update rows where the improved slug differs AND no
-- other row already holds that new slug value (skip conflicts silently).
--
-- caminos: slugs were bulk-generated in migration 20260610000002, so they
-- all need the transliteration fix.

CREATE OR REPLACE FUNCTION slugify_name(input TEXT) RETURNS TEXT AS $$
DECLARE
  v TEXT;
BEGIN
  v := LOWER(TRIM(input));

  -- Compound expansions (must run before single-char strip)
  v := REGEXP_REPLACE(v, 'ß',  'ss',  'g');
  v := REGEXP_REPLACE(v, 'ä',  'ae',  'g');
  v := REGEXP_REPLACE(v, 'ö',  'oe',  'g');
  v := REGEXP_REPLACE(v, 'ü',  'ue',  'g');
  v := REGEXP_REPLACE(v, 'å',  'aa',  'g');
  v := REGEXP_REPLACE(v, 'æ',  'ae',  'g');
  v := REGEXP_REPLACE(v, 'œ',  'oe',  'g');
  v := REGEXP_REPLACE(v, 'þ',  'th',  'g');

  -- Single-char diacritics → ASCII
  v := translate(v,
    'øðàáâãèéêëìíîïòóôõùúûýÿçñłąęśźżćńčšžřůěďťľĺŕğşı',
    'odaaaaeeeeiiiioooouuuyyçnlaeszzcsczruedtllrgs i'
  );

  -- Whitespace / underscores → hyphens
  v := REGEXP_REPLACE(v, '[\s_]+', '-', 'g');
  -- Strip anything not alphanumeric or hyphen
  v := REGEXP_REPLACE(v, '[^a-z0-9-]', '', 'g');
  -- Collapse consecutive hyphens
  v := REGEXP_REPLACE(v, '-{2,}', '-', 'g');
  -- Trim leading/trailing hyphens
  v := TRIM(BOTH '-' FROM v);

  RETURN v;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- caminos: safe to update all rows (slugs were bulk-generated in migration 20260610000002, so they
-- all need the transliteration fix.
UPDATE "caminos"
SET "slug" = slugify_name("name")
WHERE slugify_name("name") <> "slug";

-- camino_points: update only where the new slug is conflict-free
UPDATE "camino_points" cp
SET "slug" = slugify_name(cp."name")
WHERE slugify_name(cp."name") <> cp."slug"
  AND NOT EXISTS (
    SELECT 1 FROM "camino_points" other
    WHERE other."id" <> cp."id"
      AND other."slug" = slugify_name(cp."name")
  );

DROP FUNCTION slugify_name(TEXT);
