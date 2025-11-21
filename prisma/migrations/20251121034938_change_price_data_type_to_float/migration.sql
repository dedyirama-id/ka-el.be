/*
  Warnings:

  - You are about to alter the column `priceMin` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `priceMax` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "events" ALTER COLUMN "priceMin" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "priceMax" SET DATA TYPE DOUBLE PRECISION;
