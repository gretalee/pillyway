-- Correct the camino slug transliteration applied by migrations 000002 and 000003.
-- Those migrations used a translate() mapping with two bugs:
--   • ç mapped to itself instead of c  (e.g. "façade" → "faade" instead of "facade")
--   • Several Slavic characters (š, ž, ř, ů, ě, ď, ť, ĺ, ŕ) mapped to wrong letters
--   • ş mapped to a space instead of s
--
-- This migration re-slugs caminos only. Waypoint (camino_points) slugs are left
-- untouched because /waypoints/<slug> URLs have no redirect mechanism.
--
-- Duplicate new slugs receive a numeric suffix (-2, -3, …).
-- Names that produce an empty slug fall back to "camino-<id>".

CREATE OR REPLACE FUNCTION slugify_name(input TEXT) RETURNS TEXT AS $$
DECLARE
  v TEXT;
BEGIN
  v := LOWER(TRIM(input));

  -- Compound expansions (must run before single-char strip)
  v := REGEXP_REPLACE(v, 'ß', 'ss', 'g');
  v := REGEXP_REPLACE(v, 'ä', 'ae', 'g');
  v := REGEXP_REPLACE(v, 'ö', 'oe', 'g');
  v := REGEXP_REPLACE(v, 'ü', 'ue', 'g');
  v := REGEXP_REPLACE(v, 'å', 'aa', 'g');
  v := REGEXP_REPLACE(v, 'æ', 'ae', 'g');
  v := REGEXP_REPLACE(v, 'œ', 'oe', 'g');
  v := REGEXP_REPLACE(v, 'þ', 'th', 'g');

  -- Single-char diacritics → ASCII (order mirrors slug.utils.ts TRANSLITERATION_MAP)
  v := translate(v,
    'øðàáâãèéêëìíîïòóôõùúûýÿçñčšžřůěďťľĺŕłąęśźżćńğşı',
    'odaaaaeeeeiiiioooouuuyycncszruedtllrlaeszzcngsi'
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

DO $$
DECLARE
  r         RECORD;
  new_slug  TEXT;
  candidate TEXT;
  counter   INT;
BEGIN
  FOR r IN SELECT id, name, slug FROM "caminos" ORDER BY id LOOP
    new_slug := slugify_name(r.name);

    -- Skip rows where the slug is already correct
    CONTINUE WHEN new_slug = r.slug;

    IF new_slug = '' THEN
      new_slug := 'camino-' || replace(r.id::text, '-', '');
    END IF;

    candidate := new_slug;
    counter   := 2;

    WHILE EXISTS (
      SELECT 1 FROM "caminos" WHERE slug = candidate AND id <> r.id
    ) LOOP
      candidate := new_slug || '-' || counter;
      counter   := counter + 1;
    END LOOP;

    UPDATE "caminos" SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

DROP FUNCTION slugify_name(TEXT);
