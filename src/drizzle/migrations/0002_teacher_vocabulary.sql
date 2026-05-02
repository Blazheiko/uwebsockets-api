CREATE TABLE "teacher_vocabulary_collections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"lang_learning" varchar(10) NOT NULL,
	"lang_native" varchar(10) DEFAULT 'ru' NOT NULL,
	"topic_slug" varchar(100) NOT NULL,
	"topic_title" varchar(150) NOT NULL,
	"level_code" varchar(20),
	"status" varchar(20) DEFAULT 'ready' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_vocabulary_collections_user_lang_topic_key" UNIQUE("user_id","lang_learning","topic_slug")
);
--> statement-breakpoint
CREATE TABLE "teacher_vocabulary_batches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"collection_id" bigint NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"requested_count" integer DEFAULT 20 NOT NULL,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"prompt_version" varchar(50),
	"llm_model" varchar(100),
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_vocabulary_words" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"collection_id" bigint NOT NULL,
	"batch_id" bigint,
	"word" varchar(200) NOT NULL,
	"normalized_word" varchar(200) NOT NULL,
	"translation" varchar(200) NOT NULL,
	"transcription" varchar(200),
	"part_of_speech" varchar(30),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"word_voice_src" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_vocabulary_words_collection_normalized_key" UNIQUE("collection_id","normalized_word")
);
--> statement-breakpoint
CREATE TABLE "teacher_vocabulary_examples" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"word_id" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"sentence" text NOT NULL,
	"translation" text NOT NULL,
	"voice_src" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_vocabulary_progress" (
	"word_id" bigint PRIMARY KEY NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"mistakes_count" integer DEFAULT 0 NOT NULL,
	"pronunciation_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"recognition_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"mastery_status" varchar(20) DEFAULT 'new' NOT NULL,
	"next_review_at" timestamp,
	"last_practiced_at" timestamp,
	"last_correct_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "teacher_vocabulary_collections_user_id_fkey" ON "teacher_vocabulary_collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_vocabulary_batches_collection_id_fkey" ON "teacher_vocabulary_batches" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "teacher_vocabulary_batches_status_idx" ON "teacher_vocabulary_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "teacher_vocabulary_words_collection_id_fkey" ON "teacher_vocabulary_words" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "teacher_vocabulary_words_batch_id_fkey" ON "teacher_vocabulary_words" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "teacher_vocabulary_examples_word_id_fkey" ON "teacher_vocabulary_examples" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "teacher_vocabulary_progress_mastery_status_idx" ON "teacher_vocabulary_progress" USING btree ("mastery_status");--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_collections" ADD CONSTRAINT "teacher_vocabulary_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_batches" ADD CONSTRAINT "teacher_vocabulary_batches_collection_id_teacher_vocabulary_collections_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."teacher_vocabulary_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_words" ADD CONSTRAINT "teacher_vocabulary_words_collection_id_teacher_vocabulary_collections_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."teacher_vocabulary_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_words" ADD CONSTRAINT "teacher_vocabulary_words_batch_id_teacher_vocabulary_batches_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."teacher_vocabulary_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_examples" ADD CONSTRAINT "teacher_vocabulary_examples_word_id_teacher_vocabulary_words_id_fkey" FOREIGN KEY ("word_id") REFERENCES "public"."teacher_vocabulary_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_vocabulary_progress" ADD CONSTRAINT "teacher_vocabulary_progress_word_id_teacher_vocabulary_words_id_fkey" FOREIGN KEY ("word_id") REFERENCES "public"."teacher_vocabulary_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TYPE "llm_text_feature" ADD VALUE IF NOT EXISTS 'TEACHER_VOCABULARY';--> statement-breakpoint
ALTER TYPE "inworld_tts_feature" ADD VALUE IF NOT EXISTS 'TEACHER_VOCABULARY';
