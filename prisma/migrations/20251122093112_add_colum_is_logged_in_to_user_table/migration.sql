-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('personal', 'group');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isLoggedIn" BOOLEAN NOT NULL DEFAULT true;
