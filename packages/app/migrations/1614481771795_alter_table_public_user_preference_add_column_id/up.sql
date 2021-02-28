CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE "public"."user_preference" ADD COLUMN "id" uuid NOT NULL UNIQUE DEFAULT gen_random_uuid();
