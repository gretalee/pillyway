-- Reconcile drift: aligns the local DB with what the migration history and schema.prisma expect.

-- The init migration created a case-insensitive expression index on lower("name").
-- The actual DB has a standard column unique index instead (caminos_name_key on "name").
-- Replace the expression index in the shadow DB so both match the actual DB state.
DROP INDEX IF EXISTS "caminos_name_key";
CREATE UNIQUE INDEX "caminos_name_key" ON "caminos"("name");

-- sights.image_urls: drop the empty-array default so the column matches the Prisma schema.
ALTER TABLE "sights" ALTER COLUMN "image_urls" DROP DEFAULT;
