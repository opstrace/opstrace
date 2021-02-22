CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE "public"."tenant_config"("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_name" text NOT NULL, "key" text NOT NULL, "data" jsonb NOT NULL DEFAULT jsonb_build_object(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("tenant_name") REFERENCES "public"."tenant"("name") ON UPDATE cascade ON DELETE cascade, UNIQUE ("id"), UNIQUE ("tenant_name", "key"));
CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_public_tenant_config_updated_at"
BEFORE UPDATE ON "public"."tenant_config"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_tenant_config_updated_at" ON "public"."tenant_config" 
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
