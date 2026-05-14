-- Migration: add_slug_accommodation_sight
-- Step 1: Add nullable slug to camino_points, create accommodations and sights tables.
-- The slug column is nullable here so the backfill DO block below can populate it
-- before the next migration makes it NOT NULL.

-- AddColumn: nullable slug on camino_points
ALTER TABLE "camino_points" ADD COLUMN "slug" TEXT;

-- CreateTable: accommodations
CREATE TABLE "accommodations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camino_point_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sights
CREATE TABLE "sights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camino_point_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique slug on camino_points (regular unique index; PostgreSQL allows multiple NULLs)
CREATE UNIQUE INDEX "camino_points_slug_key" ON "camino_points"("slug");

-- AddForeignKey: accommodations → camino_points
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_camino_point_id_fkey"
    FOREIGN KEY ("camino_point_id") REFERENCES "camino_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: sights → camino_points
ALTER TABLE "sights" ADD CONSTRAINT "sights_camino_point_id_fkey"
    FOREIGN KEY ("camino_point_id") REFERENCES "camino_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill slug for existing rows (idempotent — only sets null slugs)
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR rec IN SELECT id, name, country FROM camino_points ORDER BY created_at ASC LOOP
    base_slug := trim(both '-' from regexp_replace(
                   regexp_replace(lower(rec.name), '[[:space:]_]+', '-', 'g'),
                   '[^a-z0-9-]', '', 'g'));
    candidate := base_slug;
    IF EXISTS (SELECT 1 FROM camino_points WHERE slug = candidate AND id <> rec.id) THEN
      candidate := base_slug || '-' || lower(rec.country);
      suffix := 2;
      WHILE EXISTS (SELECT 1 FROM camino_points WHERE slug = candidate AND id <> rec.id) LOOP
        candidate := base_slug || '-' || lower(rec.country) || '-' || suffix;
        suffix := suffix + 1;
      END LOOP;
    END IF;
    UPDATE camino_points SET slug = candidate WHERE id = rec.id AND slug IS NULL;
  END LOOP;
END;
$$;
