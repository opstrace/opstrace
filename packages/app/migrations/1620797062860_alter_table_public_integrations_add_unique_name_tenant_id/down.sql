alter table "public"."integrations" drop constraint "integrations_name_tenant_id_key";
alter table "public"."integrations" add constraint "integrations_name_key" unique ("name");
