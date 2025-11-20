-- CreateTable
CREATE TABLE "user_tags" (
    "userId" TEXT NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "user_tags_pkey" PRIMARY KEY ("userId","tagId")
);

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
