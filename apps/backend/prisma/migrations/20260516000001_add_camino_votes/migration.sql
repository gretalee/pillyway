-- CreateTable
CREATE TABLE "camino_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camino_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "vote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camino_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "camino_votes_camino_id_user_id_key" ON "camino_votes"("camino_id", "user_id");

-- AddForeignKey
ALTER TABLE "camino_votes" ADD CONSTRAINT "camino_votes_camino_id_fkey" FOREIGN KEY ("camino_id") REFERENCES "caminos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
