ALTER TABLE "public"."integration" ADD COLUMN "key" text NULL;
ALTER TABLE "public"."integration" ADD CONSTRAINT "integration_key_key" UNIQUE ("key");

-- Default existing already records to using the name field so need to keep those working
UPDATE "public"."integration" t SET key = t.name;

ALTER TABLE "public"."integration" ALTER COLUMN "key" SET NOT NULL;
