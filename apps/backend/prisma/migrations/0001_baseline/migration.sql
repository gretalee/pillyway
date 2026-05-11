yarn run v1.22.22
$ /Users/hendrike/Documents/projects/PillyWay/DEV/pillyway/apps/backend/node_modules/.bin/prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "caminos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caminos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camino_points" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camino_points_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "camino_point_order" (
    "camino_id" UUID NOT NULL,
    "camino_point_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "camino_point_order_pkey" PRIMARY KEY ("camino_id","camino_point_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "caminos_name_key" ON "caminos"("name");

-- CreateIndex
CREATE UNIQUE INDEX "camino_points_name_country_key" ON "camino_points"("name", "country");

-- CreateIndex
CREATE UNIQUE INDEX "stages_start_point_id_end_point_id_key" ON "stages"("start_point_id", "end_point_id");

-- CreateIndex
CREATE UNIQUE INDEX "camino_point_order_camino_id_position_key" ON "camino_point_order"("camino_id", "position");

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_start_point_id_fkey" FOREIGN KEY ("start_point_id") REFERENCES "camino_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_end_point_id_fkey" FOREIGN KEY ("end_point_id") REFERENCES "camino_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camino_point_order" ADD CONSTRAINT "camino_point_order_camino_id_fkey" FOREIGN KEY ("camino_id") REFERENCES "caminos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camino_point_order" ADD CONSTRAINT "camino_point_order_camino_point_id_fkey" FOREIGN KEY ("camino_point_id") REFERENCES "camino_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

Done in 0.45s.
