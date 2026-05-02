CREATE TYPE "public"."user_app_type" AS ENUM('web', 'pwa');--> statement-breakpoint
ALTER TABLE "user_online" ADD COLUMN "type_app" "user_app_type";
