DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum enum
        JOIN pg_type type ON type.oid = enum.enumtypid
        JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
        WHERE namespace.nspname = 'public'
          AND type.typname = 'llm_prompt_type'
          AND enum.enumlabel = 'TRANSLATOR_REALTIME_SYSTEM'
    ) THEN
        ALTER TYPE "public"."llm_prompt_type" ADD VALUE 'TRANSLATOR_REALTIME_SYSTEM' BEFORE 'IMAGE_STYLE';
    END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum enum
        JOIN pg_type type ON type.oid = enum.enumtypid
        JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
        WHERE namespace.nspname = 'public'
          AND type.typname = 'llm_prompt_type'
          AND enum.enumlabel = 'TRANSLATOR_REALTIME_CAPTURE'
    ) THEN
        ALTER TYPE "public"."llm_prompt_type" ADD VALUE 'TRANSLATOR_REALTIME_CAPTURE' BEFORE 'IMAGE_STYLE';
    END IF;
END
$$;
