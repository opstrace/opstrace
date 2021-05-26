ALTER TABLE "public"."integration" ADD COLUMN "key" text NULL;
ALTER TABLE "public"."integration" ADD CONSTRAINT "integration_key_key" UNIQUE ("key");

-- There are already DNS records using the integration name, so need to keep those working
UPDATE "public"."integration" t SET key = t.name;

ALTER TABLE "public"."integration" ALTER COLUMN "key" SET NOT NULL;
