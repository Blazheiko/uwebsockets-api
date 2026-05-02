ALTER TYPE "public"."llm_prompt_type" ADD VALUE IF NOT EXISTS 'SUPPORT_SYSTEM';--> statement-breakpoint
ALTER TYPE "public"."llm_prompt_type" ADD VALUE IF NOT EXISTS 'SUPPORT_FIRST_CHAT';--> statement-breakpoint
ALTER TYPE "public"."llm_text_feature" ADD VALUE IF NOT EXISTS 'SUPPORT_CHAT';--> statement-breakpoint
ALTER TYPE "public"."message_type" ADD VALUE IF NOT EXISTS 'VIDEO_CALL';--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "support_chat_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"screenshots" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "support_knowledge_base" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100),
	"screenshot_key" varchar(500),
	"screenshot_mime" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "video_calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"caller_id" bigint NOT NULL,
	"callee_id" bigint NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "video_call_id" bigint;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "support_chat_history_user_idx" ON "support_chat_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_kb_category_idx" ON "support_knowledge_base" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_calls_caller_id_fkey" ON "video_calls" USING btree ("caller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_calls_callee_id_fkey" ON "video_calls" USING btree ("callee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_video_call_id_fkey" ON "messages" USING btree ("video_call_id");--> statement-breakpoint

DO $$
BEGIN
	BEGIN
		ALTER TABLE "messages"
			ADD CONSTRAINT "messages_video_call_id_video_calls_id_fk"
			FOREIGN KEY ("video_call_id")
			REFERENCES "public"."video_calls"("id")
			ON DELETE SET NULL
			ON UPDATE NO ACTION;
	EXCEPTION
		WHEN duplicate_object THEN NULL;
		WHEN duplicate_table THEN NULL;
	END;
END
$$;--> statement-breakpoint

DO $$
BEGIN
	BEGIN
		ALTER TABLE "messages"
			ADD CONSTRAINT "messages_video_call_id_unique"
			UNIQUE ("video_call_id");
	EXCEPTION
		WHEN duplicate_object THEN NULL;
		WHEN duplicate_table THEN NULL;
	END;
END
$$;
