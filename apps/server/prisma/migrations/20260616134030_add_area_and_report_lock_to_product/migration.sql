-- CreateEnum
CREATE TYPE "Area" AS ENUM ('COCINA', 'BARRA');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "area" "Area",
ADD COLUMN     "reportedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "area" "Area";
