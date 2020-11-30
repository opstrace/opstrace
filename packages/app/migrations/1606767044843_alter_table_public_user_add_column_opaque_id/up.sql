CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE "public"."user" ADD COLUMN "opaque_id" uuid NOT NULL DEFAULT gen_random_uuid();
