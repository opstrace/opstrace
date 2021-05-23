ALTER TABLE "public"."integrations" ADD COLUMN "status" text;
ALTER TABLE "public"."integrations" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE "public"."integrations" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
