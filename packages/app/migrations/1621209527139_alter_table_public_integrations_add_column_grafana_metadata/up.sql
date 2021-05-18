ALTER TABLE "public"."integrations" ADD COLUMN "grafana_metadata" jsonb NOT NULL DEFAULT jsonb_build_object();
