do $$
declare
  tenant_row tenant%rowtype;
  existing_tenant tenant%rowtype;
  cleaned_name tenant.name%type;
  updated_name tenant.name%type;
begin

  for tenant_row in (select * from tenant) loop

    cleaned_name := (select regexp_replace(lower(tenant_row.name), '[^a-z0-9]', '', 'g'));

    if not cleaned_name = tenant_row.name then
      raise notice 'updating tenant name: "%"', tenant_row.name;

      updated_name := cleaned_name;
      loop
        select * from tenant
          into existing_tenant
          where tenant.name = updated_name;

        exit when not found;

        updated_name = CONCAT(cleaned_name, (select floor(random() * 1000 + 1)::int));
      end loop;

      raise notice 'new tenant name: "%"', updated_name;

      update tenant
        set name = "updated_name"
        where name = tenant_row.name;

    end if;

  end loop;

end $$