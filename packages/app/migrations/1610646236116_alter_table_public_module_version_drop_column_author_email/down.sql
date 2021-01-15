ALTER TABLE "public"."module_version" ADD COLUMN "author_email" text;
ALTER TABLE "public"."module_version" ALTER COLUMN "author_email" DROP NOT NULL;
