ALTER TABLE "public"."file" ADD COLUMN "alias_for" uuid;
ALTER TABLE "public"."file" ALTER COLUMN "alias_for" DROP NOT NULL;
ALTER TABLE "public"."file" ADD CONSTRAINT file_alias_for_fkey FOREIGN KEY (alias_for) REFERENCES "public"."file" (id) ON DELETE set null ON UPDATE set null;
