-- Migrate teacher_student_profiles.interests and teacher_lessons.vocabulary from text to jsonb
-- Existing NULL values stay NULL; existing JSON text values are cast to jsonb
--> statement-breakpoint
ALTER TABLE "teacher_student_profiles" ALTER COLUMN "interests" TYPE jsonb USING CASE WHEN "interests" IS NULL THEN NULL ELSE "interests"::jsonb END;
--> statement-breakpoint
ALTER TABLE "teacher_lessons" ALTER COLUMN "vocabulary" TYPE jsonb USING CASE WHEN "vocabulary" IS NULL THEN NULL ELSE "vocabulary"::jsonb END;
