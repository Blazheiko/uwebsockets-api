CREATE INDEX IF NOT EXISTS "teacher_vocabulary_progress_user_status_practiced_idx"
    ON "teacher_vocabulary_progress" USING btree ("user_id","mastery_status","last_practiced_at");
