CREATE TABLE "public"."user_preference"("email" text NOT NULL, PRIMARY KEY ("email") , FOREIGN KEY ("email") REFERENCES "public"."user"("email") ON UPDATE cascade ON DELETE cascade);
