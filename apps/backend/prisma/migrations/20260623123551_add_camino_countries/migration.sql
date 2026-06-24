-- AlterTable
ALTER TABLE "caminos" ADD COLUMN     "countries" TEXT[] DEFAULT ARRAY[]::TEXT[];
