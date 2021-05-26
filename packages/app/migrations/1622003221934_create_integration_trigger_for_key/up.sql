CREATE TRIGGER t_integration_insert
  BEFORE INSERT ON integration
  FOR EACH ROW
  WHEN (NEW.name IS NOT NULL AND NEW.key IS NULL)
  EXECUTE PROCEDURE set_key_from_name();
