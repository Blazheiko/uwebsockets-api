-- Manual rollout migration for shared study audio.
-- Run order:
-- 1. db:migrate
-- 2. pnpm --filter backend db:backfill-study-audio
-- 3. verify shared rows, then remove legacy fallback in app code in a later cleanup release
-- While legacy bridge is enabled, shared rows may still reference legacy S3 keys.
-- Do not cleanup legacy S3 objects until the bridge is removed or those rows are re-pointed.
-- Bridge reuse is voice-scoped and may serve stale audio if legacy text drifted from current content.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'teacher_phrase_audio'
          AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'teacher_phrase_audio_legacy'
    ) THEN
        ALTER TABLE "teacher_phrase_audio" RENAME TO "teacher_phrase_audio_legacy";
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "teacher_phrase_audio" (
    "scope" "teacher_phrase_audio_scope" NOT NULL,
    "scope_id" bigint NOT NULL,
    "voice" varchar(100) NOT NULL,
    "language" varchar(20) NOT NULL,
    "content_hash" varchar(40) NOT NULL,
    "voice_src" varchar(500) NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_phrase_audio_scope_scope_id_voice_language_hash_idx"
    ON "teacher_phrase_audio" USING btree ("scope", "scope_id", "voice", "language", "content_hash");

CREATE INDEX IF NOT EXISTS "teacher_phrase_audio_scope_scope_id_idx"
    ON "teacher_phrase_audio" USING btree ("scope", "scope_id");

CREATE INDEX IF NOT EXISTS "teacher_phrase_audio_voice_src_idx"
    ON "teacher_phrase_audio" USING btree ("voice_src");
