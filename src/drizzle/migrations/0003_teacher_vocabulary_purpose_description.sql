ALTER TABLE "teacher_vocabulary_collections" ADD COLUMN "purpose_description" text;
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_collections" ADD COLUMN "purpose_slug" varchar(160);
--> statement-breakpoint
UPDATE "teacher_vocabulary_collections"
SET
  "purpose_description" = "topic_title",
  "purpose_slug" = "topic_slug"
WHERE "purpose_description" IS NULL OR "purpose_slug" IS NULL;
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_collections" ALTER COLUMN "purpose_description" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_collections" ALTER COLUMN "purpose_slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_collections" DROP CONSTRAINT "teacher_vocabulary_collections_user_lang_topic_key";
--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_collections" ADD CONSTRAINT "teacher_vocabulary_collections_user_lang_topic_purpose_key" UNIQUE("user_id","lang_learning","topic_slug","purpose_slug");
