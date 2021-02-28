ALTER TABLE "public"."user" ALTER COLUMN "session_last_updated" DROP DEFAULT;
ALTER TABLE "public"."user" ALTER COLUMN "session_last_updated" DROP NOT NULL;
