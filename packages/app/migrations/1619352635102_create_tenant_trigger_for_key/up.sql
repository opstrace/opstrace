CREATE TRIGGER t_tenant_insert
  BEFORE INSERT ON tenant
  FOR EACH ROW
  WHEN (NEW.name IS NOT NULL AND NEW.key IS NULL)
  EXECUTE PROCEDURE set_key_from_name();