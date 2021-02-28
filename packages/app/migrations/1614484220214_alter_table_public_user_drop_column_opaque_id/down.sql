ALTER TABLE "public"."user" ADD COLUMN "opaque_id" uuid;
ALTER TABLE "public"."user" ALTER COLUMN "opaque_id" DROP NOT NULL;
ALTER TABLE "public"."user" ALTER COLUMN "opaque_id" SET DEFAULT gen_random_uuid();
