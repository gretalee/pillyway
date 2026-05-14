-- Migration: make_camino_point_slug_not_null
-- Step 2: Make slug NOT NULL now that the backfill is guaranteed to have run.

ALTER TABLE "camino_points" ALTER COLUMN "slug" SET NOT NULL;
