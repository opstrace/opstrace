alter table "public"."user" drop constraint "user_pkey";
alter table "public"."user"
    add constraint "user_pkey" 
    primary key ( "id" );
