-- AlterTable
ALTER TABLE "caminos" ALTER COLUMN "slug" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "camino_gpx_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camino_id" UUID NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploader_name" VARCHAR(200) NOT NULL,
    "file_name" VARCHAR(100) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "camino_gpx_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "camino_gpx_files_camino_id_created_at_idx" ON "camino_gpx_files"("camino_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "camino_gpx_files_uploaded_by_idx" ON "camino_gpx_files"("uploaded_by");

-- AddForeignKey
ALTER TABLE "camino_gpx_files" ADD CONSTRAINT "camino_gpx_files_camino_id_fkey" FOREIGN KEY ("camino_id") REFERENCES "caminos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
