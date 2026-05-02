CREATE TYPE "public"."promo_code_benefit" AS ENUM('PREMIUM_DAYS', 'BETA_ACCESS', 'FREE_TRIAL', 'PARTNER_DISCOUNT', 'PREMIUM_DISCOUNT');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'partner';--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"benefit_type" "promo_code_benefit" NOT NULL,
	"benefit_value" integer DEFAULT 0 NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"partner_id" bigint,
	"created_by" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_link_clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"referrer_id" bigint NOT NULL,
	"fingerprint" varchar(64),
	"converted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_usages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"referrer_id" bigint NOT NULL,
	"referee_id" bigint NOT NULL,
	"reward_granted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_usages_referee_id_unique" UNIQUE("referee_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "premium_until" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "beta_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "premium_discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promo_codes_created_by_fkey" ON "promo_codes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "promo_codes_partner_id_fkey" ON "promo_codes" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "referral_link_clicks_referrer_id_fkey" ON "referral_link_clicks" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "referral_link_clicks_created_at_idx" ON "referral_link_clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "referral_usages_referrer_id_fkey" ON "referral_usages" USING btree ("referrer_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");