-- Drop existing foreign keys to replace them with explicit ON UPDATE CASCADE rules
ALTER TABLE "messages" DROP CONSTRAINT "messages_phoneNumber_fkey";
ALTER TABLE "event_tags" DROP CONSTRAINT "event_tags_eventId_fkey";
ALTER TABLE "event_tags" DROP CONSTRAINT "event_tags_tagId_fkey";
ALTER TABLE "user_tags" DROP CONSTRAINT "user_tags_userId_fkey";
ALTER TABLE "user_tags" DROP CONSTRAINT "user_tags_tagId_fkey";

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_phoneNumber_fkey" FOREIGN KEY ("phoneNumber") REFERENCES "users"("phoneE164") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
