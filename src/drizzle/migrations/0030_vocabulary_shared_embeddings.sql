CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_collections"
    ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_vocabulary_collections_embedding_idx"
    ON "teacher_vocabulary_collections"
    USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_vocabulary_collections_reuse_filter_idx"
    ON "teacher_vocabulary_collections" USING btree ("lang_learning","lang_native","level_code");
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_collections"
    DROP CONSTRAINT IF EXISTS "teacher_vocabulary_collections_user_lang_topic_purpose_key";
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_collections"
    DROP CONSTRAINT IF EXISTS "teacher_vocabulary_collections_user_lang_topic_key";
--> statement-breakpoint
DROP INDEX IF EXISTS "teacher_vocabulary_collections_content_key";
--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_vocabulary_collections_content_key"
    ON "teacher_vocabulary_collections" (
        "lang_learning",
        "lang_native",
        "topic_slug",
        "purpose_slug",
        COALESCE("level_code", '')
    );
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_batches_collection_id_teacher_vocabulary_collections_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_batches"
            ADD CONSTRAINT "teacher_vocabulary_batches_collection_id_teacher_vocabulary_collections_id_fkey"
            FOREIGN KEY ("collection_id") REFERENCES "public"."teacher_vocabulary_collections"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_words_collection_id_teacher_vocabulary_collections_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_words"
            ADD CONSTRAINT "teacher_vocabulary_words_collection_id_teacher_vocabulary_collections_id_fkey"
            FOREIGN KEY ("collection_id") REFERENCES "public"."teacher_vocabulary_collections"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_words_batch_id_teacher_vocabulary_batches_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_words"
            ADD CONSTRAINT "teacher_vocabulary_words_batch_id_teacher_vocabulary_batches_id_fkey"
            FOREIGN KEY ("batch_id") REFERENCES "public"."teacher_vocabulary_batches"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_examples_word_id_teacher_vocabulary_words_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_examples"
            ADD CONSTRAINT "teacher_vocabulary_examples_word_id_teacher_vocabulary_words_id_fkey"
            FOREIGN KEY ("word_id") REFERENCES "public"."teacher_vocabulary_words"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_progress_word_id_teacher_vocabulary_words_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_progress"
            ADD CONSTRAINT "teacher_vocabulary_progress_word_id_teacher_vocabulary_words_id_fkey"
            FOREIGN KEY ("word_id") REFERENCES "public"."teacher_vocabulary_words"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teacher_vocabulary_user_collections" (
    "user_id" bigint NOT NULL,
    "collection_id" bigint NOT NULL,
    "added_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "teacher_vocabulary_user_collections_user_id_collection_id_pk" PRIMARY KEY("user_id","collection_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_vocabulary_user_collections_user_id_idx"
    ON "teacher_vocabulary_user_collections" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_vocabulary_user_collections_collection_id_idx"
    ON "teacher_vocabulary_user_collections" USING btree ("collection_id");
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_user_collections_user_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_user_collections"
            ADD CONSTRAINT "teacher_vocabulary_user_collections_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_user_collections_collection_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_user_collections"
            ADD CONSTRAINT "teacher_vocabulary_user_collections_collection_id_fkey"
            FOREIGN KEY ("collection_id") REFERENCES "public"."teacher_vocabulary_collections"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
INSERT INTO "teacher_vocabulary_user_collections" ("user_id", "collection_id")
SELECT "user_id", "id" FROM "teacher_vocabulary_collections"
ON CONFLICT ("user_id", "collection_id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_words" DROP COLUMN IF EXISTS "word_voice_src";
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_examples" DROP COLUMN IF EXISTS "voice_src";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teacher_vocabulary_word_audio" (
    "user_id" bigint NOT NULL,
    "word_id" bigint NOT NULL,
    "voice" varchar(100) NOT NULL,
    "voice_src" varchar(500) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "teacher_vocabulary_word_audio_user_id_word_id_pk" PRIMARY KEY("user_id","word_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_vocabulary_word_audio_word_id_idx"
    ON "teacher_vocabulary_word_audio" USING btree ("word_id");
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_word_audio_user_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_word_audio"
            ADD CONSTRAINT "teacher_vocabulary_word_audio_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_word_audio_word_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_word_audio"
            ADD CONSTRAINT "teacher_vocabulary_word_audio_word_id_fkey"
            FOREIGN KEY ("word_id") REFERENCES "public"."teacher_vocabulary_words"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teacher_vocabulary_example_audio" (
    "user_id" bigint NOT NULL,
    "example_id" bigint NOT NULL,
    "voice" varchar(100) NOT NULL,
    "voice_src" varchar(500) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "teacher_vocabulary_example_audio_user_id_example_id_pk" PRIMARY KEY("user_id","example_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_vocabulary_example_audio_example_id_idx"
    ON "teacher_vocabulary_example_audio" USING btree ("example_id");
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_example_audio_user_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_example_audio"
            ADD CONSTRAINT "teacher_vocabulary_example_audio_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_example_audio_example_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_example_audio"
            ADD CONSTRAINT "teacher_vocabulary_example_audio_example_id_fkey"
            FOREIGN KEY ("example_id") REFERENCES "public"."teacher_vocabulary_examples"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_progress"
    ADD COLUMN IF NOT EXISTS "user_id" bigint;
--> statement-breakpoint
UPDATE "teacher_vocabulary_progress" tvp
SET "user_id" = tvc."user_id"
FROM "teacher_vocabulary_words" tvw
JOIN "teacher_vocabulary_collections" tvc ON tvc."id" = tvw."collection_id"
WHERE tvp."word_id" = tvw."id"
  AND tvp."user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_progress"
    ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_progress"
    DROP CONSTRAINT IF EXISTS "teacher_vocabulary_progress_pkey";
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_progress"
    ADD CONSTRAINT "teacher_vocabulary_progress_user_id_word_id_pk" PRIMARY KEY("user_id","word_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "teacher_vocabulary_progress_mastery_status_idx";
--> statement-breakpoint
CREATE INDEX "teacher_vocabulary_progress_mastery_status_idx"
    ON "teacher_vocabulary_progress" USING btree ("user_id","mastery_status");
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teacher_vocabulary_progress_user_id_fkey'
    ) THEN
        ALTER TABLE "teacher_vocabulary_progress"
            ADD CONSTRAINT "teacher_vocabulary_progress_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
