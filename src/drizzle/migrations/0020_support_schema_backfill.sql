ALTER TYPE "public"."llm_prompt_type" ADD VALUE IF NOT EXISTS 'SUPPORT_SYSTEM';--> statement-breakpoint
ALTER TYPE "public"."llm_prompt_type" ADD VALUE IF NOT EXISTS 'SUPPORT_FIRST_CHAT';--> statement-breakpoint
ALTER TYPE "public"."llm_text_feature" ADD VALUE IF NOT EXISTS 'SUPPORT_CHAT';--> statement-breakpoint

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping CREATE EXTENSION vector due to insufficient privileges';
END
$$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "support_chat_history" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "user_id" bigint NOT NULL,
    "role" "chat_role" NOT NULL,
    "content" text NOT NULL,
    "screenshots" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'support_chat_history_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "support_chat_history"
            ADD CONSTRAINT "support_chat_history_user_id_users_id_fk"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END
$$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "support_chat_history_user_idx"
    ON "support_chat_history" USING btree ("user_id");--> statement-breakpoint

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

CREATE INDEX IF NOT EXISTS "support_kb_category_idx"
    ON "support_knowledge_base" USING btree ("category");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "support_kb_active_idx"
    ON "support_knowledge_base" USING btree ("is_active");--> statement-breakpoint

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'vector'
    ) THEN
        ALTER TABLE "support_knowledge_base"
            ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
    END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'vector'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'support_kb_embedding_idx'
    ) THEN
        EXECUTE 'CREATE INDEX "support_kb_embedding_idx" ON "support_knowledge_base" USING hnsw ("embedding" vector_cosine_ops)';
    END IF;
END
$$;--> statement-breakpoint
