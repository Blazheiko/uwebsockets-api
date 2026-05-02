CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."inworld_tts_feature" AS ENUM('TEACHER_CHAT', 'TRANSLATOR_TRANSLATE');--> statement-breakpoint
CREATE TYPE "public"."llm_audio_feature" AS ENUM('TEACHER_STT', 'TRANSLATOR_STT');--> statement-breakpoint
CREATE TYPE "public"."llm_image_feature" AS ENUM('AVATAR_GENERATE', 'CHAT_IMAGE_EDIT');--> statement-breakpoint
CREATE TYPE "public"."llm_prompt_type" AS ENUM('TEACHER_SYSTEM', 'TEACHER_LESSON', 'TRANSLATOR_SYSTEM', 'TRANSLATOR_SUMMARY', 'IMAGE_STYLE', 'TEACHER_FIRST_CHAT');--> statement-breakpoint
CREATE TYPE "public"."llm_text_feature" AS ENUM('TRANSLATOR_TRANSLATE', 'TRANSLATOR_SUMMARY', 'TEACHER_CHAT', 'TEACHER_LESSON', 'TEACHER_FACTS', 'PROMPT_TEST');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE');--> statement-breakpoint
CREATE TYPE "public"."push_notification_status" AS ENUM('SENT', 'FAILED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."translator_input_type" AS ENUM('voice', 'text');--> statement-breakpoint
CREATE TYPE "public"."translator_side" AS ENUM('owner', 'opponent');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "calendar" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_list" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"contact_id" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"rename" varchar(100),
	"last_message_id" bigint,
	CONSTRAINT "contact_list_user_id_contact_id_key" UNIQUE("user_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"user_id" bigint NOT NULL,
	"invited_id" bigint,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "inworld_tts_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"model" varchar(100) NOT NULL,
	"voice" varchar(100) NOT NULL,
	"feature" "inworld_tts_feature" NOT NULL,
	"character_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_audio_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"model" varchar(100) NOT NULL,
	"feature" "llm_audio_feature" NOT NULL,
	"audio_bytes" integer DEFAULT 0 NOT NULL,
	"text_length" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_image_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"llm_system_prompt_id" bigint,
	"model" varchar(100) NOT NULL,
	"feature" "llm_image_feature" NOT NULL,
	"image_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_system_prompts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" "llm_prompt_type" NOT NULL,
	"topic" varchar(100),
	"content" text NOT NULL,
	"model" varchar(100),
	"temperature" real,
	"max_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "llm_system_prompts_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE "llm_text_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"llm_system_prompt_id" bigint,
	"model" varchar(100) NOT NULL,
	"feature" "llm_text_feature" NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sender_id" bigint NOT NULL,
	"receiver_id" bigint NOT NULL,
	"type" "message_type" DEFAULT 'TEXT' NOT NULL,
	"content" text NOT NULL,
	"src" varchar(500),
	"thumbnail" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"calendar_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes_photos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"note_id" bigint NOT NULL,
	"src" varchar(500) NOT NULL,
	"filename" varchar(255),
	"size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"provider_email" varchar(255),
	"provider_name" varchar(255),
	"provider_avatar" varchar(500),
	"access_token" text,
	"refresh_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_accounts_provider_provider_user_id_key" UNIQUE("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "push_notifications_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"subscription_id" bigint,
	"message_title" varchar(255),
	"message_body" text,
	"message_data" jsonb,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"status" "push_notification_status",
	"error_message" text,
	"response_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"device_type" varchar(50),
	"browser_name" varchar(100),
	"browser_version" varchar(50),
	"os_name" varchar(100),
	"os_version" varchar(50),
	"notification_types" jsonb,
	"timezone" varchar(50),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "teacher_chat_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"lang_learning" varchar(10) NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_lessons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"session_id" bigint,
	"lang_learning" varchar(10) NOT NULL,
	"content" text NOT NULL,
	"vocabulary" text,
	"grammar_notes" text,
	"homework" text,
	"is_reviewed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_settings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"lang_native" varchar(10) DEFAULT 'ru' NOT NULL,
	"lang_learning" varchar(10) DEFAULT 'en' NOT NULL,
	"topic" varchar(50) DEFAULT 'everyday' NOT NULL,
	"teacher_voice" varchar(100) DEFAULT 'Ashley' NOT NULL,
	"teacher_voice_gender" varchar(10) DEFAULT 'female' NOT NULL,
	"teacher_name" varchar(100) DEFAULT '' NOT NULL,
	"own_voice" varchar(100) DEFAULT 'Ashley' NOT NULL,
	"own_voice_gender" varchar(10) DEFAULT 'female' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_settings_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_student_facts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"lang_learning" varchar(10) NOT NULL,
	"fact" text NOT NULL,
	"source_session_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_student_profiles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"lang_learning" varchar(10) NOT NULL,
	"lang_native" varchar(10) DEFAULT 'ru' NOT NULL,
	"level" varchar(10) DEFAULT 'a1' NOT NULL,
	"total_lessons" integer DEFAULT 0 NOT NULL,
	"total_words" integer DEFAULT 0 NOT NULL,
	"interests" text,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_student_profiles_user_id_lang_learning_key" UNIQUE("user_id","lang_learning")
);
--> statement-breakpoint
CREATE TABLE "translator_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"side" "translator_side" NOT NULL,
	"source_text" text NOT NULL,
	"translated_text" text,
	"source_lang" varchar(10) NOT NULL,
	"target_lang" varchar(10) NOT NULL,
	"input_type" "translator_input_type" DEFAULT 'voice' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translator_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"lang_owner" varchar(10) DEFAULT 'ru' NOT NULL,
	"lang_opponent" varchar(10) DEFAULT 'en' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"title_owner" varchar(255),
	"description_owner" text,
	"title_opponent" varchar(255),
	"description_opponent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"phone" varchar(20),
	"avatar" varchar(500),
	"is_admin" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE INDEX "calendar_user_id_fkey" ON "calendar" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_list_contact_id_fkey" ON "contact_list" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_list_last_message_id_fkey" ON "contact_list" USING btree ("last_message_id");--> statement-breakpoint
CREATE INDEX "invitations_invited_id_fkey" ON "invitations" USING btree ("invited_id");--> statement-breakpoint
CREATE INDEX "invitations_user_id_fkey" ON "invitations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inworld_tts_usage_user_id_idx" ON "inworld_tts_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inworld_tts_usage_created_at_idx" ON "inworld_tts_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_audio_usage_user_id_idx" ON "llm_audio_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "llm_audio_usage_created_at_idx" ON "llm_audio_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_image_usage_user_id_fkey" ON "llm_image_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "llm_image_usage_created_at_idx" ON "llm_image_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_text_usage_user_id_fkey" ON "llm_text_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "llm_text_usage_created_at_idx" ON "llm_text_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_calendar_id_fkey" ON "messages" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "messages_receiver_id_fkey" ON "messages" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "messages_sender_id_fkey" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "notes_user_id_fkey" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notes_photos_note_id_fkey" ON "notes_photos" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_fkey" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_notifications_log_user_id_fkey" ON "push_notifications_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_notifications_log_subscription_id_fkey" ON "push_notifications_log" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_fkey" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_chat_history_user_id_fkey" ON "teacher_chat_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_lessons_user_id_fkey" ON "teacher_lessons" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_lessons_session_id_fkey" ON "teacher_lessons" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "teacher_settings_user_id_fkey" ON "teacher_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_student_facts_user_id_fkey" ON "teacher_student_facts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_student_facts_source_session_id_fkey" ON "teacher_student_facts" USING btree ("source_session_id");--> statement-breakpoint
CREATE INDEX "teacher_student_profiles_user_id_fkey" ON "teacher_student_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "translator_messages_session_id_fkey" ON "translator_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "translator_sessions_user_id_fkey" ON "translator_sessions" USING btree ("user_id");