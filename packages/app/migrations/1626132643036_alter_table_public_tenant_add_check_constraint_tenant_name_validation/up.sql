alter table "public"."tenant" add constraint "tenant_name_validation" check (name ~ '^[a-z0-9]{2,63}$'::text);
