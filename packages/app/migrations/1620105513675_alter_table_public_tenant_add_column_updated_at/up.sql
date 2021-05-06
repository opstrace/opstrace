ALTER TABLE "public"."tenant" ADD COLUMN "updated_at" timestamp NOT NULL DEFAULT now();
