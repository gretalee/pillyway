-- CreateTable
CREATE TABLE "stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "start_point_id" UUID NOT NULL,
    "end_point_id" UUID NOT NULL,
    "distance" DOUBLE PRECISION,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stages_start_point_id_end_point_id_key" ON "stages"("start_point_id", "end_point_id");

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_start_point_id_fkey" FOREIGN KEY ("start_point_id") REFERENCES "camino_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_end_point_id_fkey" FOREIGN KEY ("end_point_id") REFERENCES "camino_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
