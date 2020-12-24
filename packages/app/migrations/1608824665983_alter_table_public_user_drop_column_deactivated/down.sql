ALTER TABLE "public"."user" ADD COLUMN "deactivated" bool;
ALTER TABLE "public"."user" ALTER COLUMN "deactivated" DROP NOT NULL;
ALTER TABLE "public"."user" ALTER COLUMN "deactivated" SET DEFAULT false;
