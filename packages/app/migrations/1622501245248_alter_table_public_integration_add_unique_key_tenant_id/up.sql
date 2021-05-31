alter table "public"."integration" drop constraint "integration_key_key";
alter table "public"."integration" add constraint "integration_key_tenant_id_key" unique ("key", "tenant_id");
