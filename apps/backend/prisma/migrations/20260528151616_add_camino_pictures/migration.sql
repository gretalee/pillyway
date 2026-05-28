-- CreateTable
CREATE TABLE "camino_pictures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camino_id" UUID NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "camino_pictures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "camino_pictures_camino_id_position_created_at_idx" ON "camino_pictures"("camino_id", "position", "created_at");

-- CreateIndex
CREATE INDEX "camino_pictures_uploaded_by_idx" ON "camino_pictures"("uploaded_by");

-- AddForeignKey
ALTER TABLE "camino_pictures" ADD CONSTRAINT "camino_pictures_camino_id_fkey" FOREIGN KEY ("camino_id") REFERENCES "caminos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: at most one primary picture per camino
CREATE UNIQUE INDEX "camino_pictures_primary_unique" ON "camino_pictures" ("camino_id") WHERE "is_primary" = true;
