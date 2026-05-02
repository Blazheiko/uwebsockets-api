CREATE TABLE "user_online" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"session_id" varchar(255),
	"socket_uuid" varchar(64) NOT NULL,
	"role" "user_role",
	"ip_address" varchar(45),
	"user_agent" text,
	"connected_at" timestamp NOT NULL,
	"disconnected_at" timestamp,
	"connection_duration_ms" bigint,
	"close_code" integer,
	"is_first_connection" boolean DEFAULT false NOT NULL,
	"is_last_connection" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_online_socket_uuid_unique" UNIQUE("socket_uuid")
);
--> statement-breakpoint
ALTER TABLE "user_online" ADD CONSTRAINT "user_online_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_online_user_id_idx" ON "user_online" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_online_user_id_connected_at_idx" ON "user_online" USING btree ("user_id","connected_at");--> statement-breakpoint
CREATE INDEX "user_online_connected_at_idx" ON "user_online" USING btree ("connected_at");--> statement-breakpoint
CREATE INDEX "user_online_disconnected_at_idx" ON "user_online" USING btree ("disconnected_at");
