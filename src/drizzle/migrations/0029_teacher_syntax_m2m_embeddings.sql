DELETE FROM "teacher_syntax_exercise_attempts";
--> statement-breakpoint
DELETE FROM "teacher_syntax_attempts";
--> statement-breakpoint
DELETE FROM "teacher_syntax_progress";
--> statement-breakpoint
DELETE FROM "teacher_syntax_exercise_options";
--> statement-breakpoint
DELETE FROM "teacher_syntax_exercises";
--> statement-breakpoint
DELETE FROM "teacher_syntax_examples";
--> statement-breakpoint
DELETE FROM "teacher_syntax_sections";
--> statement-breakpoint
DELETE FROM "teacher_syntax_lessons";
--> statement-breakpoint
DROP TABLE "teacher_syntax_progress";
--> statement-breakpoint
DROP INDEX IF EXISTS "teacher_syntax_lessons_user_id_lang_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "teacher_syntax_lessons_user_id_status_idx";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "teacher_syntax_lessons" ADD COLUMN "embedding" vector(1536);
--> statement-breakpoint
CREATE INDEX "teacher_syntax_lessons_embedding_idx"
    ON "teacher_syntax_lessons"
    USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX "teacher_syntax_lessons_reuse_filter_idx"
    ON "teacher_syntax_lessons" USING btree ("lang_learning","lang_native","level_code");
--> statement-breakpoint
ALTER TABLE "teacher_syntax_examples" DROP COLUMN "voice_src";
--> statement-breakpoint
CREATE TABLE "teacher_syntax_example_audio" (
    "user_id" bigint NOT NULL,
    "example_id" bigint NOT NULL,
    "voice" varchar(100) NOT NULL,
    "voice_src" varchar(500) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "teacher_syntax_example_audio_user_id_example_id_pk" PRIMARY KEY("user_id","example_id")
);
--> statement-breakpoint
CREATE INDEX "teacher_syntax_example_audio_example_id_idx"
    ON "teacher_syntax_example_audio" USING btree ("example_id");
--> statement-breakpoint
ALTER TABLE "teacher_syntax_example_audio" ADD CONSTRAINT "teacher_syntax_example_audio_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "teacher_syntax_example_audio" ADD CONSTRAINT "teacher_syntax_example_audio_example_id_fkey"
    FOREIGN KEY ("example_id") REFERENCES "public"."teacher_syntax_examples"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "teacher_syntax_user_lessons" (
    "user_id" bigint NOT NULL,
    "lesson_id" bigint NOT NULL,
    "total_exercises" integer DEFAULT 0 NOT NULL,
    "completed_exercises" integer DEFAULT 0 NOT NULL,
    "correct_count" integer DEFAULT 0 NOT NULL,
    "mistakes_count" integer DEFAULT 0 NOT NULL,
    "mastery_status" varchar(20) DEFAULT 'new' NOT NULL,
    "last_practiced_at" timestamp,
    "added_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "teacher_syntax_user_lessons_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE INDEX "teacher_syntax_user_lessons_user_id_idx"
    ON "teacher_syntax_user_lessons" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "teacher_syntax_user_lessons_lesson_id_idx"
    ON "teacher_syntax_user_lessons" USING btree ("lesson_id");
--> statement-breakpoint
CREATE INDEX "teacher_syntax_user_lessons_mastery_status_idx"
    ON "teacher_syntax_user_lessons" USING btree ("user_id","mastery_status");
--> statement-breakpoint
ALTER TABLE "teacher_syntax_user_lessons" ADD CONSTRAINT "teacher_syntax_user_lessons_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "teacher_syntax_user_lessons" ADD CONSTRAINT "teacher_syntax_user_lessons_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "public"."teacher_syntax_lessons"("id") ON DELETE cascade ON UPDATE no action;
