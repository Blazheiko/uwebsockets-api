CREATE TABLE "teacher_syntax_lessons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"lang_learning" varchar(10) NOT NULL,
	"lang_native" varchar(10) NOT NULL,
	"source_topic" varchar(200) NOT NULL,
	"topic_slug" varchar(120) NOT NULL,
	"topic_title" varchar(200) NOT NULL,
	"rule_summary" text NOT NULL,
	"level_code" varchar(20),
	"study_topic" varchar(200),
	"learning_goal" text,
	"status" varchar(20) DEFAULT 'generating' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_syntax_sections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lesson_id" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"heading" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_syntax_examples" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lesson_id" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"sentence" text NOT NULL,
	"translation" text NOT NULL,
	"highlight" varchar(200),
	"note" text,
	"voice_src" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_syntax_exercises" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lesson_id" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"type" varchar(30) NOT NULL,
	"instruction" text NOT NULL,
	"prompt_text" text NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_syntax_exercise_options" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"exercise_id" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"text" varchar(300) NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_syntax_progress" (
	"lesson_id" bigint PRIMARY KEY NOT NULL,
	"total_exercises" integer DEFAULT 0 NOT NULL,
	"completed_exercises" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"mistakes_count" integer DEFAULT 0 NOT NULL,
	"mastery_status" varchar(20) DEFAULT 'new' NOT NULL,
	"last_practiced_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_syntax_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lesson_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"total_exercises" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"mistakes_count" integer DEFAULT 0 NOT NULL,
	"result_status" varchar(20) DEFAULT 'in_progress' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_syntax_exercise_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attempt_id" bigint NOT NULL,
	"lesson_id" bigint NOT NULL,
	"exercise_id" bigint NOT NULL,
	"user_answer" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"feedback" text,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "teacher_syntax_lessons_user_id_lang_idx" ON "teacher_syntax_lessons" USING btree ("user_id","lang_learning");--> statement-breakpoint
CREATE INDEX "teacher_syntax_lessons_user_id_status_idx" ON "teacher_syntax_lessons" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "teacher_syntax_lessons_topic_slug_idx" ON "teacher_syntax_lessons" USING btree ("topic_slug");--> statement-breakpoint
CREATE INDEX "teacher_syntax_sections_lesson_id_fkey" ON "teacher_syntax_sections" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "teacher_syntax_examples_lesson_id_fkey" ON "teacher_syntax_examples" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "teacher_syntax_exercises_lesson_id_fkey" ON "teacher_syntax_exercises" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "teacher_syntax_exercise_options_exercise_id_fkey" ON "teacher_syntax_exercise_options" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "teacher_syntax_progress_mastery_status_idx" ON "teacher_syntax_progress" USING btree ("mastery_status");--> statement-breakpoint
CREATE INDEX "teacher_syntax_attempts_lesson_id_fkey" ON "teacher_syntax_attempts" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "teacher_syntax_attempts_user_id_fkey" ON "teacher_syntax_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_syntax_exercise_attempts_attempt_id_fkey" ON "teacher_syntax_exercise_attempts" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "teacher_syntax_exercise_attempts_lesson_id_fkey" ON "teacher_syntax_exercise_attempts" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "teacher_syntax_exercise_attempts_exercise_id_fkey" ON "teacher_syntax_exercise_attempts" USING btree ("exercise_id");--> statement-breakpoint
ALTER TABLE "teacher_syntax_lessons" ADD CONSTRAINT "teacher_syntax_lessons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_sections" ADD CONSTRAINT "teacher_syntax_sections_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."teacher_syntax_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_examples" ADD CONSTRAINT "teacher_syntax_examples_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."teacher_syntax_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_exercises" ADD CONSTRAINT "teacher_syntax_exercises_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."teacher_syntax_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_exercise_options" ADD CONSTRAINT "teacher_syntax_exercise_options_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."teacher_syntax_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_progress" ADD CONSTRAINT "teacher_syntax_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."teacher_syntax_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_attempts" ADD CONSTRAINT "teacher_syntax_attempts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."teacher_syntax_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_attempts" ADD CONSTRAINT "teacher_syntax_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_exercise_attempts" ADD CONSTRAINT "teacher_syntax_exercise_attempts_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."teacher_syntax_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_exercise_attempts" ADD CONSTRAINT "teacher_syntax_exercise_attempts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."teacher_syntax_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_syntax_exercise_attempts" ADD CONSTRAINT "teacher_syntax_exercise_attempts_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."teacher_syntax_exercises"("id") ON DELETE cascade ON UPDATE no action;
