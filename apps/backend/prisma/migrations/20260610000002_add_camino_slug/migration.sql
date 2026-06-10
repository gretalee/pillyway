-- Add slug column (nullable for backfill)
ALTER TABLE "caminos" ADD COLUMN "slug" VARCHAR(255);

-- Backfill: derive slug from name (lowercase, spaces→hyphens, strip non-alphanumeric)
UPDATE "caminos"
SET "slug" = TRIM(BOTH '-' FROM
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      LOWER(TRIM("name")),
      '[\s_]+', '-', 'g'
    ),
    '[^a-z0-9-]', '', 'g'
  )
);

-- Make NOT NULL and enforce uniqueness
ALTER TABLE "caminos" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "caminos_slug_key" ON "caminos"("slug");
