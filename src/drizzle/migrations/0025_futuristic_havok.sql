ALTER TABLE "public"."promo_codes" ALTER COLUMN "benefit_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."promo_code_benefit";--> statement-breakpoint
CREATE TYPE "public"."promo_code_benefit" AS ENUM('PREMIUM_DAYS', 'BETA_ACCESS', 'FREE_TRIAL', 'PARTNER_DISCOUNT');--> statement-breakpoint
ALTER TABLE "public"."promo_codes" ALTER COLUMN "benefit_type" SET DATA TYPE "public"."promo_code_benefit" USING "benefit_type"::"public"."promo_code_benefit";