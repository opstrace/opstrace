alter table "public"."user_preference"
           add constraint "user_preference_user_id_fkey"
           foreign key ("user_id")
           references "public"."user"
           ("id") on update cascade on delete cascade;
