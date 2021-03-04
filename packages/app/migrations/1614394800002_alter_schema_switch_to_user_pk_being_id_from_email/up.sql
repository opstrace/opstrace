alter table "public"."user_preference" drop constraint "user_preference_pkey";
alter table "public"."user_preference"
    add constraint "user_preference_pkey"
    primary key ( "id" );

alter table "public"."user_preference"
           add constraint "user_preference_user_id_fkey"
           foreign key ("user_id")
           references "public"."user"
           ("id") on update cascade on delete cascade;

alter table "public"."user_preference" drop constraint "user_preference_email_fkey";
ALTER TABLE "public"."user_preference" DROP COLUMN "email" CASCADE;

alter table "public"."user" drop constraint "user_pkey";
alter table "public"."user"
    add constraint "user_pkey"
    primary key ( "id" );
alter table "public"."user" add constraint "user_email_key" unique ("email");
ALTER TABLE "public"."user" DROP COLUMN "opaque_id" CASCADE;
