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

UPDATE "caminos"
SET "slug" = slugify_name("name");

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

-- Make NOT NULL and enforce uniqueness
ALTER TABLE "caminos" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "caminos_slug_key" ON "caminos"("slug");
