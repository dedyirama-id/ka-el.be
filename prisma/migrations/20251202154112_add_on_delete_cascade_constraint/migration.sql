-- DropForeignKey
ALTER TABLE "event_tags" DROP CONSTRAINT "event_tags_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_tags" DROP CONSTRAINT "event_tags_tagId_fkey";

-- DropForeignKey
ALTER TABLE "user_tags" DROP CONSTRAINT "user_tags_tagId_fkey";

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
