ALTER TABLE "public"."integrations" ADD COLUMN "grafana_folder_id" int4;
ALTER TABLE "public"."integrations" ALTER COLUMN "grafana_folder_id" DROP NOT NULL;
