-- Add slug column (nullable for backfill)
ALTER TABLE "caminos" ADD COLUMN "slug" VARCHAR(255);

-- Backfill slugs using full transliteration (matches the TypeScript slugify() utility).
-- Function is dropped at the end of this migration.

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

-- Backfill caminos one row at a time so duplicates and empty slugs are handled
-- safely before the NOT NULL + UNIQUE constraints are applied.
-- Duplicate names get a numeric suffix (-2, -3, …).
-- Names that slugify to an empty string fall back to "camino-<id>".
DO $$
DECLARE
  r         RECORD;
  base_slug TEXT;
  candidate TEXT;
  counter   INT;
BEGIN
  FOR r IN SELECT id, name FROM "caminos" ORDER BY id LOOP
    base_slug := slugify_name(r.name);

    IF base_slug = '' THEN
      base_slug := 'camino-' || replace(r.id::text, '-', '');
    END IF;

    candidate := base_slug;
    counter   := 2;

    WHILE EXISTS (
      SELECT 1 FROM "caminos" WHERE slug = candidate AND id <> r.id
    ) LOOP
      candidate := base_slug || '-' || counter;
      counter   := counter + 1;
    END LOOP;

    UPDATE "caminos" SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

DROP FUNCTION slugify_name(TEXT);

-- Make NOT NULL and enforce uniqueness
ALTER TABLE "caminos" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "caminos_slug_key" ON "caminos"("slug");
