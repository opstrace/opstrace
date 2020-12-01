ALTER TABLE "public"."tenant" ADD COLUMN "state" text;
ALTER TABLE "public"."tenant" ALTER COLUMN "state" DROP NOT NULL;
ALTER TABLE "public"."tenant" ALTER COLUMN "state" SET DEFAULT 'PROVISIONING'::text;
