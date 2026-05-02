ALTER TABLE "users" ADD COLUMN "promo_code_id" bigint;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_promo_code_id_idx" ON "users" USING btree ("promo_code_id");
