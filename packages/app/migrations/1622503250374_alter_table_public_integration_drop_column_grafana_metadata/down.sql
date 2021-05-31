ALTER TABLE "public"."integration" ADD COLUMN "grafana_metadata" jsonb;
ALTER TABLE "public"."integration" ALTER COLUMN "grafana_metadata" DROP NOT NULL;
ALTER TABLE "public"."integration" ALTER COLUMN "grafana_metadata" SET DEFAULT jsonb_build_object();
