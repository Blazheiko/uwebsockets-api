CREATE TYPE "public"."translator_realtime_modality" AS ENUM('audio', 'text');--> statement-breakpoint
CREATE TYPE "public"."translator_realtime_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "translator_realtime_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"provider_item_id" varchar(191) NOT NULL,
	"role" "translator_realtime_role" NOT NULL,
	"side" "translator_side",
	"modality" "translator_realtime_modality" DEFAULT 'audio' NOT NULL,
	"source_text" text,
	"output_text" text,
	"source_lang" varchar(10),
	"target_lang" varchar(10),
	"reply_to_provider_item_id" varchar(191),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "translator_realtime_messages_provider_item_id_key" UNIQUE("provider_item_id")
);
--> statement-breakpoint
CREATE INDEX "translator_realtime_messages_session_id_fkey" ON "translator_realtime_messages" USING btree ("session_id");