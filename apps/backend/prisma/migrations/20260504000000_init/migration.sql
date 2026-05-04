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
CREATE TABLE "camino_point_order" (
    "camino_id" UUID NOT NULL,
    "camino_point_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "camino_point_order_pkey" PRIMARY KEY ("camino_id","camino_point_id")
);

-- CreateIndex: case-insensitive unique index on camino name (named to match Prisma's @@unique([name]) expectation)
CREATE UNIQUE INDEX "caminos_name_key" ON "caminos"(lower("name"));

-- CreateIndex
CREATE UNIQUE INDEX "camino_points_name_country_key" ON "camino_points"("name", "country");

-- CreateIndex
CREATE UNIQUE INDEX "camino_point_order_camino_id_position_key" ON "camino_point_order"("camino_id", "position");

-- AddForeignKey
ALTER TABLE "camino_point_order" ADD CONSTRAINT "camino_point_order_camino_id_fkey" FOREIGN KEY ("camino_id") REFERENCES "caminos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camino_point_order" ADD CONSTRAINT "camino_point_order_camino_point_id_fkey" FOREIGN KEY ("camino_point_id") REFERENCES "camino_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;
