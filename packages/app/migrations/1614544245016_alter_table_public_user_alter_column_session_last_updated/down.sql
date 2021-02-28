ALTER TABLE ONLY "public"."user" ALTER COLUMN "session_last_updated" SET DEFAULT now();
ALTER TABLE "public"."user" ALTER COLUMN "session_last_updated" SET NOT NULL;
