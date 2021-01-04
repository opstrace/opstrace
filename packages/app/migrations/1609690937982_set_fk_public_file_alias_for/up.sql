alter table "public"."file"
           add constraint "file_alias_for_fkey"
           foreign key ("alias_for")
           references "public"."file"
           ("id") on update set null on delete set null;
