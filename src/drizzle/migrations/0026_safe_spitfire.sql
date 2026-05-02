-- Step 1: Add column as nullable to avoid constraint failure on existing rows
ALTER TABLE "users" ADD COLUMN "session_token" varchar(24);--> statement-breakpoint

-- Step 2: Populate existing rows with a unique random token.
-- Uses md5() + clock_timestamp() + id — all available in PostgreSQL without any extensions.
-- Including id in the hash guarantees uniqueness; clock_timestamp() and random() add entropy.
UPDATE "users"
SET "session_token" = substring(md5(clock_timestamp()::text || id::text || random()::text), 1, 21)
WHERE "session_token" IS NULL;--> statement-breakpoint

-- Step 3: Add NOT NULL constraint now that all rows have a value
ALTER TABLE "users" ALTER COLUMN "session_token" SET NOT NULL;--> statement-breakpoint

-- Step 4: Add UNIQUE constraint
ALTER TABLE "users" ADD CONSTRAINT "users_session_token_unique" UNIQUE("session_token");
