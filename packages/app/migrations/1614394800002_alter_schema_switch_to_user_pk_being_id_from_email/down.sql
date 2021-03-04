alter table "public"."user" drop constraint "user_email_key";
alter table "public"."user" drop constraint "user_pkey";
alter table "public"."user"
    add constraint "user_pkey"
    primary key ( "email" );
ALTER TABLE "public"."user" ADD COLUMN "opaque_id" uuid;
ALTER TABLE "public"."user" ALTER COLUMN "opaque_id" DROP NOT NULL;
ALTER TABLE "public"."user" ALTER COLUMN "opaque_id" SET DEFAULT gen_random_uuid();


ALTER TABLE "public"."user_preference" ADD COLUMN "email" text;
ALTER TABLE "public"."user_preference" ALTER COLUMN "email" DROP NOT NULL;
alter table "public"."user_preference" add foreign key ("email") references "public"."user"("email") on update cascade on delete cascade;

alter table "public"."user_preference" drop constraint "user_preference_user_id_fkey";

alter table "public"."user_preference" drop constraint "user_preference_pkey";
alter table "public"."user_preference"
    add constraint "user_preference_pkey"
    primary key ( "email" );