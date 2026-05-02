-- 1. Расширить enum промптов
ALTER TYPE llm_prompt_type ADD VALUE IF NOT EXISTS 'SUPPORT_SYSTEM';
ALTER TYPE llm_prompt_type ADD VALUE IF NOT EXISTS 'SUPPORT_FIRST_CHAT';

-- 2. Расширить enum фич LLM
ALTER TYPE llm_text_feature ADD VALUE IF NOT EXISTS 'SUPPORT_CHAT';

-- 3. Таблица базы знаний с векторами (1536d для OpenAI text-embedding-3-small)
CREATE TABLE support_knowledge_base (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    category        VARCHAR(100),
    screenshot_key  VARCHAR(500),
    screenshot_mime VARCHAR(50),
    embedding       vector(1536),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX support_kb_embedding_idx
    ON support_knowledge_base
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX support_kb_category_idx
    ON support_knowledge_base (category);

CREATE INDEX support_kb_active_idx
    ON support_knowledge_base (is_active);

-- 4. Таблица истории чата поддержки
CREATE TABLE support_chat_history (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        chat_role NOT NULL,
    content     TEXT NOT NULL,
    screenshots JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX support_chat_history_user_idx
    ON support_chat_history (user_id);

-- 5. Seed промптов
INSERT INTO llm_system_prompts (type, topic, content, model, temperature, max_tokens)
VALUES (
    'SUPPORT_SYSTEM',
    'Support Agent',
    'You are a technical support agent for the ITVibe application.
Your task is to help users understand the application''s features.

RULES:
- Answer ONLY based on the provided knowledge base context
- If the context does not contain information about the question, honestly say you do not know and suggest contacting support
- Respond in the same language the user writes in
- Be polite and specific
- If a relevant article has a screenshot, insert [screenshot:{article_id}] in the response at an appropriate place
- Do not invent features that are not in the context
- Keep answers concise and actionable

KNOWLEDGE BASE CONTEXT:
{context}',
    NULL,
    0.3,
    2048
),
(
    'SUPPORT_FIRST_CHAT',
    'Support Greeting',
    'Greet the user. Introduce yourself as the ITVibe app support agent.
Briefly describe what you can do: answer questions about app features, show how things work, help with settings.
Ask how you can help.
Respond in the user''s language.
Keep it short — 2-3 sentences max.',
    NULL,
    0.5,
    512
);
