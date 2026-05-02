ALTER TYPE "public"."message_type" ADD VALUE 'VIDEO_CALL';--> statement-breakpoint
CREATE TABLE "video_calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"caller_id" bigint NOT NULL,
	"callee_id" bigint NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "video_call_id" bigint;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_video_call_id_video_calls_id_fk" FOREIGN KEY ("video_call_id") REFERENCES "public"."video_calls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_calls_caller_id_fkey" ON "video_calls" USING btree ("caller_id");--> statement-breakpoint
CREATE INDEX "video_calls_callee_id_fkey" ON "video_calls" USING btree ("callee_id");--> statement-breakpoint
CREATE INDEX "messages_video_call_id_fkey" ON "messages" USING btree ("video_call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_video_call_id_unique" ON "messages" USING btree ("video_call_id");
