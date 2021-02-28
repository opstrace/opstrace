ALTER TABLE "public"."user_preference" ADD COLUMN "email" text;
ALTER TABLE "public"."user_preference" ALTER COLUMN "email" DROP NOT NULL;
