/*
  Warnings:

  - A unique constraint covering the columns `[deleteToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_phoneNumber_fkey";

-- DropForeignKey
ALTER TABLE "user_tags" DROP CONSTRAINT "user_tags_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleteToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_deleteToken_key" ON "users"("deleteToken");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_phoneNumber_fkey" FOREIGN KEY ("phoneNumber") REFERENCES "users"("phoneE164") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
