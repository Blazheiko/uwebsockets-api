CREATE TYPE "public"."grok_tts_feature" AS ENUM('TEACHER_CHAT', 'TEACHER_VOCABULARY', 'TEACHER_SYNTAX', 'TRANSLATOR_TRANSLATE');--> statement-breakpoint
CREATE TABLE "grok_tts_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"voice" varchar(100) NOT NULL,
	"language" varchar(20) DEFAULT '' NOT NULL,
	"feature" "grok_tts_feature" NOT NULL,
	"character_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "grok_tts_usage_user_id_idx" ON "grok_tts_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "grok_tts_usage_created_at_idx" ON "grok_tts_usage" USING btree ("created_at");