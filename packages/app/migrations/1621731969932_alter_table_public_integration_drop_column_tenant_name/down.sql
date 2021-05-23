ALTER TABLE "public"."integration" ADD COLUMN "tenant_name" text;
ALTER TABLE "public"."integration" ALTER COLUMN "tenant_name" DROP NOT NULL;
