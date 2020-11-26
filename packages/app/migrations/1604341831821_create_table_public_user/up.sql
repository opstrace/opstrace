CREATE TABLE "public"."user"("email" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("email") );
