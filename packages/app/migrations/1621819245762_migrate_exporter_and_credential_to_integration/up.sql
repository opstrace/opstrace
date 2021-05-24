-- first pass: migrate exporters with credentials
--   integration.name := exporter.name
--   integration.tenant_id := tenant.id where tenant.name = exporter.tenant
--   integration.kind := "exporter-" + exporter.type
--   integration.data["config"] := exporter.config
--   integration.data["credential"] := credential.value where credential.name = exporter.credential
INSERT INTO integration (
  name,
  tenant_id,
  kind,
  data
)
SELECT
  name,
  -- get tenant id:
  (SELECT id FROM tenant WHERE name = tenant),
  -- concatenate "exporter-" + type:
  'exporter-' || type,
  -- merge two json objects, one with the config and the other with the (non-null) credential:
  jsonb_build_object('config', config) || jsonb_build_object('credential', (SELECT value FROM credential WHERE name = credential))
FROM exporter WHERE credential IS NOT NULL;

-- second pass: migrate exporters without credentials
--   integration.name := exporter.name
--   integration.tenant_id := tenant.id where tenant.name = exporter.tenant
--   integration.kind := "exporter-" + exporter.type
--   integration.data["config"] := exporter.config (not moving to root level - keep consistent across exporters and allow for other subfields later)
INSERT INTO integration (
  name,
  tenant_id,
  kind,
  data
)
SELECT
  name,
  -- get tenant id:
  (SELECT id FROM tenant WHERE name = tenant),
  -- concatenate "exporter-" + type:
  'exporter-' || type,
  -- nest the config under json "config" field, with no credential field:
  jsonb_build_object('config', config)
FROM exporter WHERE credential IS NULL;
