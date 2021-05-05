ALTER TABLE "public"."tenant" ADD COLUMN "key" text NULL;
ALTER TABLE "public"."tenant" ADD CONSTRAINT "tenant_key_key" UNIQUE ("key");

-- There are already DNS records using the tenant name, so need to keep those working
UPDATE "public"."tenant" t SET key = t.name;

ALTER TABLE "public"."tenant" ALTER COLUMN "key" SET NOT NULL;
