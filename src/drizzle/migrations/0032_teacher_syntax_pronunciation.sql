TRUNCATE TABLE "teacher_syntax_lessons" CASCADE;

DO $$
BEGIN
    CREATE TYPE "teacher_phrase_audio_scope" AS ENUM (
        'syntax_example',
        'syntax_exercise',
        'vocabulary_word',
        'vocabulary_example'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "pronunciation_status_enum" AS ENUM ('pending', 'passed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "pronunciation_skip_reason_enum" AS ENUM ('attempt_limit', 'technical_unavailable');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "teacher_phrase_audio" (
    "user_id" bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "scope" "teacher_phrase_audio_scope" NOT NULL,
    "scope_id" bigint NOT NULL,
    "voice" varchar(100) NOT NULL,
    "voice_src" varchar(500) NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_phrase_audio_user_scope_scope_id_voice_idx"
    ON "teacher_phrase_audio" USING btree ("user_id", "scope", "scope_id", "voice");

CREATE INDEX IF NOT EXISTS "teacher_phrase_audio_scope_scope_id_idx"
    ON "teacher_phrase_audio" USING btree ("scope", "scope_id");

ALTER TABLE "teacher_syntax_exercises"
    ADD COLUMN IF NOT EXISTS "repeat_phrase" text NOT NULL,
    ADD COLUMN IF NOT EXISTS "repeat_translation" text,
    ADD COLUMN IF NOT EXISTS "repeat_hint" text;

ALTER TABLE "teacher_syntax_user_lessons"
    ADD COLUMN IF NOT EXISTS "pronounced_exercises" integer NOT NULL DEFAULT 0;

ALTER TABLE "teacher_syntax_exercise_attempts"
    ADD COLUMN IF NOT EXISTS "recognized_text" text,
    ADD COLUMN IF NOT EXISTS "pronunciation_score" numeric(5, 2),
    ADD COLUMN IF NOT EXISTS "pronunciation_status" "pronunciation_status_enum" NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS "skip_reason" "pronunciation_skip_reason_enum",
    ADD COLUMN IF NOT EXISTS "skip_reported_by" varchar(20),
    ADD COLUMN IF NOT EXISTS "pronunciation_attempts_count" integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "pronunciation_passed_at" timestamp,
    ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

ALTER TABLE "teacher_syntax_exercise_attempts"
    DROP CONSTRAINT IF EXISTS "teacher_syntax_exercise_attempts_attempt_id_exercise_id_uidx";

ALTER TABLE "teacher_syntax_exercise_attempts"
    ADD CONSTRAINT "teacher_syntax_exercise_attempts_attempt_id_exercise_id_uidx"
        UNIQUE ("attempt_id", "exercise_id");

ALTER TABLE "teacher_syntax_exercise_attempts"
    DROP CONSTRAINT IF EXISTS "teacher_syntax_exercise_attempts_passed_state_chk";

ALTER TABLE "teacher_syntax_exercise_attempts"
    ADD CONSTRAINT "teacher_syntax_exercise_attempts_passed_state_chk"
        CHECK (
            ("pronunciation_status" = 'passed') = ("pronunciation_passed_at" IS NOT NULL)
        );

ALTER TABLE "teacher_syntax_exercise_attempts"
    DROP CONSTRAINT IF EXISTS "teacher_syntax_exercise_attempts_skipped_state_chk";

ALTER TABLE "teacher_syntax_exercise_attempts"
    ADD CONSTRAINT "teacher_syntax_exercise_attempts_skipped_state_chk"
        CHECK (
            ("pronunciation_status" = 'skipped') = ("skip_reason" IS NOT NULL)
        );

ALTER TABLE "teacher_syntax_exercise_attempts"
    DROP CONSTRAINT IF EXISTS "teacher_syntax_exercise_attempts_completed_state_chk";

ALTER TABLE "teacher_syntax_exercise_attempts"
    ADD CONSTRAINT "teacher_syntax_exercise_attempts_completed_state_chk"
        CHECK (
            ("pronunciation_status" <> 'pending') = ("completed_at" IS NOT NULL)
        );

ALTER TABLE "teacher_syntax_exercise_attempts"
    DROP CONSTRAINT IF EXISTS "teacher_syntax_exercise_attempts_skip_reported_by_chk";

ALTER TABLE "teacher_syntax_exercise_attempts"
    ADD CONSTRAINT "teacher_syntax_exercise_attempts_skip_reported_by_chk"
        CHECK (
            "skip_reported_by" IS NULL OR "skip_reported_by" IN ('client', 'server')
        );
