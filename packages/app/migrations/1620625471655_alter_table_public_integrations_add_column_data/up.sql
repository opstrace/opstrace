ALTER TABLE "public"."integrations" ADD COLUMN "data" jsonb NOT NULL DEFAULT jsonb_build_object();
