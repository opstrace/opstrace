alter table "public"."user_preference" add foreign key ("email") references "public"."user"("email") on update cascade on delete cascade;
