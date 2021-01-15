ALTER TABLE "public"."file" ADD COLUMN "is_modified" bool;
ALTER TABLE "public"."file" ALTER COLUMN "is_modified" DROP NOT NULL;
ALTER TABLE "public"."file" ALTER COLUMN "is_modified" SET DEFAULT false;
