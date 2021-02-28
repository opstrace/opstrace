alter table "public"."user_preference" drop constraint "user_preference_pkey";
alter table "public"."user_preference"
    add constraint "user_preference_pkey" 
    primary key ( "id" );
