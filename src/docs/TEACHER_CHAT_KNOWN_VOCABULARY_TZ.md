# Technical Specification: Known Vocabulary Context for AI Teacher

## Goal

AI Teacher must know which vocabulary words the student has already practiced and use those words naturally during teacher chat.

The feature should help the student consolidate learned vocabulary by reusing known words in short examples, questions, corrections, and practice prompts. The teacher must not overload every response with vocabulary and must not treat brand-new words as learned.

## Current State

The application already has the required vocabulary domain model:

- `teacher_vocabulary_collections` stores vocabulary collections by topic, language, native language, level, and purpose.
- `teacher_vocabulary_words` stores words, translations, transcription, part of speech, and examples.
- `teacher_vocabulary_progress` stores per-user word progress with `attempts_count`, `correct_count`, `mistakes_count`, `mastery_status`, `last_practiced_at`, and `last_correct_at`.
- `teacher_vocabulary_user_collections` links users to vocabulary collections.

AI Teacher chat currently builds context in `teacherService.chat()` from:

- student profile;
- student facts;
- recent teacher chat history;
- recent lessons;
- active lesson vocabulary when `lessonId` is provided.

Known vocabulary progress is not currently passed to `teacherLlmService.chatStream()`.

## Functional Requirements

1. AI Teacher must receive a compact context block with the student's known vocabulary for the current `langLearning`.
2. The context must distinguish between vocabulary statuses:
   - `mastered`: words the teacher can freely reuse;
   - `reviewing`: words the teacher should use for spaced repetition;
   - `learning`: words the teacher can use sparingly with contextual clues;
   - `new`: words that should not be treated as learned.
3. AI Teacher should naturally use 0-1 known words per short chat response, and up to 2 only when the student explicitly asks for a vocabulary exercise.
4. AI Teacher should prioritize `mastered` and `reviewing` words over `learning` words.
5. AI Teacher should not list vocabulary mechanically in every answer.
6. The repository query must deduplicate words by `normalizedWord`. If the same normalized word exists in multiple attached collections, it must appear only once in the prompt context.
7. Deduplication must keep the strongest progress status for each `normalizedWord`, using the same status priority as `getVocabularyStats`: `mastered` > `reviewing` > `learning` > `new`.
8. The repository query must filter by both `langLearning` and `langNative`, because word translations are stored in the collection native language.
9. Words from the active lesson vocabulary must be excluded from the general known vocabulary block to avoid duplicate prompt instructions.
10. Known vocabulary context must be built lazily only after vocabulary intent handling, because `ask_topic` and `create_vocabulary` branches return before `chatStream()`.
11. Known vocabulary context must be added only for non-first-chat responses. First chat remains focused on greeting and collecting initial student context.
12. Vocabulary ranking must prefer pedagogically useful words, not only the words with the highest success count.
13. If the known vocabulary SQL query fails, teacher chat must continue without the known vocabulary block and the error must be logged.
14. For V1, `langNative` filtering is strict. Collections created with a previous native language must not be included in the prompt context after the user's native language changes.
15. Known vocabulary context must be cached for a short TTL to avoid running the 4-table JOIN on every chat message.
16. The cache must use Redis, not process memory, so it remains shared across backend instances and WebSocket workers.
17. V1 intentionally allows old `mastered` words to appear in context; old practice date means the word is a candidate for light recall, not an exclusion condition.
18. The feature should work without frontend changes for the first implementation.

## Proposed Backend Implementation

### 1. Add Repository Query

Add a method to `teacherVocabularyRepository`, for example:

```ts
findUserVocabularyForTeacherContext(params: {
  userId: bigint
  langLearning: string
  langNative: string
  excludeNormalizedWords?: string[]
  limit?: number
}): Promise<TeacherKnownVocabularyContextRow[]>
```

Recommended fields:

- `word`
- `normalizedWord`
- `translation`
- `masteryStatus`
- `correctCount`
- `smoothedErrorRate`
- `lastPracticedAt`

The query should join:

- `teacher_vocabulary_progress`
- `teacher_vocabulary_words`
- `teacher_vocabulary_collections`
- `teacher_vocabulary_user_collections`

The query must filter by:

- `progress.user_id = userId`
- `collections.lang_learning = langLearning`
- `collections.lang_native = langNative`
- user is attached to the collection through `teacher_vocabulary_user_collections`
- `words.normalized_word` is not in `excludeNormalizedWords`, when exclusions are provided

The query must group by `normalizedWord` to avoid duplicates from shared/reused collections. Use the same status priority approach as `getVocabularyStats`, where each status is mapped to a rank:

- `mastered` = 4
- `reviewing` = 3
- `learning` = 2
- `new` = 1
- missing or unknown status = 0

For each `normalizedWord`, keep one row with the highest status rank. When there are multiple rows with the same status rank, prefer the row with higher `correctCount`, then the most recent `lastPracticedAt`.

The query or selector should expose `smoothedErrorRate` for ranking:

```sql
(mistakes_count + 1)::float / (attempts_count + 2)
```

Use smoothing instead of raw `mistakes_count / attempts_count` because raw error rate is unstable for words with very few attempts.

### 2. Build Context Lazily in Chat Flow

Build a compact context object in `teacherService.chat()` only after vocabulary intent handling has completed.

Current chat flow first calls `detectVocabularyIntent()`. If the intent is `ask_topic` or `create_vocabulary`, `teacherService.chat()` returns before calling `teacherLlmService.chatStream()`. Therefore, the known vocabulary SQL query must not run before these early-return branches.

Recommended placement:

1. Save user message.
2. Run `detectVocabularyIntent()`.
3. Handle and return for `ask_topic`.
4. Handle and return for successful `create_vocabulary`.
5. Resolve active lesson context.
6. Read known vocabulary context from the appropriate short-lived cache.
7. On cache miss, build known vocabulary context from the repository query.
8. Store the result in the cache with TTL.
9. Call `teacherLlmService.chatStream()`.

The query still executes per message on cache miss, but the expected steady state during active chat is one query per cache key per TTL window.

### 3. Select Compact Vocabulary Context

Recommended limits:

- `mastered`: up to 10 words, sorted by `lastPracticedAt ASC NULLS FIRST`, then `smoothedErrorRate DESC`, then `correctCount DESC`;
- `reviewing`: up to 10 words, sorted by `smoothedErrorRate DESC`, then `lastPracticedAt ASC NULLS FIRST`;
- `learning`: up to 5 words, sorted by `smoothedErrorRate DESC`, then `lastPracticedAt ASC NULLS FIRST`;
- `new`: do not include in the positive known vocabulary block.

Recommended total context size: 25 words maximum.

Rationale:

- `mastered` words with very high `correctCount` do not need constant repetition; prefer words that have not been practiced recently.
- `reviewing` and `learning` words with higher smoothed error rates are more useful for light reinforcement.
- The final prompt list should remain small enough to keep teacher responses natural.

Before selecting the final prompt lists, exclude words already present in `activeLessonContext.vocabularyWords`. Use the same normalization logic as vocabulary generation to compare active lesson words with `normalizedWord`.

### 4. Pass Context to LLM Service

Add a new optional argument to `teacherLlmService.chatStream()`, for example:

```ts
knownVocabularyContext?: KnownVocabularyPromptContext
```

Keep this argument near existing contextual parameters such as `activeLessonContext`.

### 5. Build Prompt Block

Add a helper in `teacher-llm-service.ts`, for example:

```ts
function buildKnownVocabularyContextBlock(
  context?: KnownVocabularyPromptContext,
): string
```

Example prompt block:

```text
Student known vocabulary:

Mastered. You may freely reuse these words in natural examples and questions:
meeting (встреча), deadline (срок)

Reviewing. Prefer these for light repetition when relevant:
schedule (расписание), confirm (подтверждать)

Learning. Use sparingly, with context clues that hint at meaning:
postpone (переносить)

Rules:
- Use known vocabulary naturally, not in every message.
- Usually include no more than 0-1 known words in a short chat response.
- Use up to 2 known words only when the student asks for a vocabulary exercise.
- Prefer mastered and reviewing words.
- Do not assume learning/new words are already fully known.
- For learning words, prefer natural context clues over explicit translations.
- Add a translation only when the student seems confused or explicitly asks.
- If the active lesson has vocabulary, prioritize active lesson words first.
```

### 6. Add Prompt Block to Chat Stream

In `teacherLlmService.chatStream()`, include the block in the non-first-chat `systemPrompt` together with:

- student information;
- active lesson context;
- recent lessons.

Recommended priority:

1. active lesson vocabulary;
2. mastered/reviewing vocabulary;
3. learning vocabulary with hints.

Do not include the known vocabulary block when `isFirstChat === true`. The first chat system prompt currently uses only the first-chat persona, and this behavior should remain unchanged in V1.

### 7. Graceful Fallback

Known vocabulary context is helpful but not required for chat correctness. Wrap the repository query and context selection in `try/catch`.

If the query or selector fails:

- log the error with `userId`, `langLearning`, and `langNative`;
- continue `teacherService.chat()` with `knownVocabularyContext` omitted;
- do not emit `teacher_chat_error` only because known vocabulary context failed.

### 8. Native Language Behavior

For V1, strict `langNative` filtering is required. If the user changes their native language, vocabulary collections created with the previous `langNative` are excluded from teacher chat context.

Do not fallback to collections in another native language in V1. A future version may translate old vocabulary or explicitly mark fallback translations, but mixing translations from another native language in the teacher prompt is more harmful than omitting those words.

### 9. Short-Lived Context Cache

Known vocabulary changes mainly after vocabulary practice, while chat sessions can send several messages per minute. V1 must include a short-lived cache to reduce repeated SQL work.

Recommended cache key:

```text
teacher-known-vocabulary:{userId}:{langLearning}:{langNative}:{activeLessonHash}
```

Cache key notes:

- include `activeLessonHash` or equivalent normalized active lesson exclusion key, because active lesson words are subtracted from the known vocabulary block;
- if there is no active lesson, use a stable value such as `no-lesson`.

TTL:

- default: 30-60 seconds;
- prefer 30 seconds if vocabulary practice can happen during active chat;
- stale data within this TTL is acceptable because the context is only a personalization hint.

Cache storage:

- use Redis for both WebSocket and HTTP callers;
- do not use in-memory cache for V1 because multiple backend instances/workers would each have their own cache and multiply SQL load.
- Redis reads/writes should use short timeouts so chat can continue without known vocabulary context if Redis is slow.

Freshness behavior:

- after vocabulary practice updates, best effort cache invalidation is recommended when easy;
- if invalidation is not implemented in V1, TTL-based freshness is acceptable and must be documented in code comments.

### 10. No Frontend Changes in V1

Teacher chat already streams backend-generated responses. Since the vocabulary context is added server-side, no Vue component or Pinia store changes are required for the first version.

## Optional Enhancements

### Related Vocabulary Retrieval

For better relevance, later versions can retrieve words related to the current user message:

- use collection embeddings where available;
- match topic titles against the current message;
- prioritize words from collections similar to the active lesson or chat topic.
- reuse `teacher-vocabulary-embedding-service.ts` and `getPriorityWordsByCollectionIds()` as a fallback strategy when active lesson or topic context is available.

If an active lesson exists, a later version can embed the lesson topic/content and prioritize words from nearby vocabulary collections before applying the general known vocabulary ranking.

### Versioned Cache Invalidation

A later version can replace simple TTL freshness with explicit versioned invalidation:

- store a version counter in Redis;
- increment it from vocabulary progress update paths;
- include the version in the cache key.

### Conversation-Level Vocabulary Tracking

A later version can store which known words were used by AI Teacher in chat responses. This would allow:

- avoiding repeated use of the same words too often;
- showing "words practiced in conversation" in the vocabulary UI;
- improving spaced repetition scheduling.

This requires a new table or event log and should not be included in V1 unless explicitly needed.

### Prompt Admin Support

If the app's admin prompt editor should control this behavior, add a new prompt type such as `TEACHER_KNOWN_VOCABULARY_CONTEXT` or expand `TEACHER_APP_CAPABILITIES`.

For V1, hardcoded dynamic prompt assembly is safer because the block depends on live user-specific data.

A balanced option is to keep the word list assembly hardcoded, but move only the static rules text into a promptService-managed prompt such as `TEACHER_KNOWN_VOCABULARY_RULES`. This would let admins tune tone and behavior without changing release code.

## Non-Functional Requirements

- Keep prompt size bounded to avoid high token usage.
- Do not fetch all user vocabulary into the prompt.
- Do not run the known vocabulary SQL query in chat branches that return before `chatStream()`.
- Cache known vocabulary context for 30-60 seconds to avoid repeated JOIN queries during active chat.
- Use Redis for known vocabulary context cache.
- Use short Redis and SQL timeouts around known vocabulary context loading; timeout must not fail teacher chat.
- Add a Drizzle-safe database migration for a supporting progress index, for example `(user_id, mastery_status, last_practiced_at)`, to keep status-filtered ordering efficient as vocabulary grows.
- Do not use `CREATE INDEX CONCURRENTLY` inside the Drizzle migration, because `drizzle-kit migrate` may run migrations in a transaction.
- For large production tables, optionally create the same index with `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...` as a separate pre-deploy SQL step before running the Drizzle migration. The Drizzle migration remains idempotent and should then no-op.
- Avoid adding database writes in the normal chat path.
- Keep the implementation backend-only for V1.
- Preserve existing chat behavior, TTS streaming, vocabulary proposal actions, and active lesson behavior.

## Acceptance Criteria

1. When the student has `mastered` or `reviewing` words, AI Teacher receives those words in the system prompt.
2. AI Teacher can naturally reuse known words in chat examples and questions.
3. AI Teacher does not treat `new` words as learned.
4. Active lesson vocabulary remains higher priority than general known vocabulary.
5. Chat works normally for users without vocabulary progress.
6. Prompt context remains bounded and does not include more than the configured word limits.
7. Duplicate words from multiple attached collections are grouped by `normalizedWord` and appear only once.
8. The known vocabulary query only includes words whose collection `langNative` matches the current student native language.
9. Words already present in the active lesson vocabulary are not repeated in the known vocabulary block.
10. The known vocabulary query is not executed for `ask_topic` and successful `create_vocabulary` intent branches.
11. First-chat responses do not include the known vocabulary block.
12. `mastered` ranking prefers words not practiced recently over words with the highest `correctCount`.
13. `reviewing` and `learning` ranking accounts for `smoothedErrorRate`.
14. Teacher prompt rules say `0-1` known words per short reply and up to `2` only for explicit exercises.
15. A supporting database index for `(user_id, mastery_status, last_practiced_at)` is added.
16. If known vocabulary context loading fails, chat continues without the block and logs the error.
17. If the user's current `langNative` differs from older vocabulary collections, those collections are excluded from the V1 known vocabulary context.
18. The prompt block uses compact comma-separated word lists, not numbered lists.
19. Teacher chat uses a short-lived Redis cache and does not run the known vocabulary repository query on every message within the TTL window for the same cache key.
20. No in-memory process cache is used for known vocabulary context.
21. Cache keys include active lesson exclusions, so different active lesson vocabularies cannot reuse an incompatible known vocabulary block.
22. Existing teacher chat tests and TypeScript checks pass.

## Suggested Test Plan

1. Unit-test the repository query with a user who has multiple collections, duplicate `normalizedWord` values, mixed progress statuses, and multiple `langNative` values.
2. Unit-test context selection logic:
   - caps are respected;
   - `new` words are excluded;
   - active lesson words are excluded;
   - `mastered` words are sorted by oldest `lastPracticedAt` first;
   - `reviewing` and `learning` words are sorted by `smoothedErrorRate` first;
   - sorting is deterministic.
3. Unit-test prompt block generation:
   - empty context returns an empty string;
   - statuses are rendered into correct sections;
   - rules are included.
4. Snapshot-test the assembled non-first-chat `systemPrompt` to ensure the known vocabulary block appears in the intended location and uses the compact format.
5. Integration-test `teacherService.chat()` with seeded vocabulary progress and assert that the final LLM prompt contains the known vocabulary block.
6. Integration-test that `ask_topic` and successful `create_vocabulary` intent branches do not execute the known vocabulary query.
7. Integration-test that first-chat prompts do not include the known vocabulary block.
8. Regression-test that a known vocabulary repository error is logged and chat continues without `teacher_chat_error`.
9. Unit-test cache key generation, including `langLearning`, `langNative`, and active lesson exclusions.
10. Unit-test or integration-test Redis cache hit/miss behavior within the TTL window.
12. Regression-test a user with no vocabulary progress to ensure chat still works.

## Main Risks

- Prompt bloat if too many words are included.
- AI may overuse known words if instructions are too strong.
- `learning` words can be incorrectly treated as fully known unless the prompt explicitly says to use them sparingly with context clues.

## Recommended Implementation Scope for V1

Implement only:

- repository query;
- bounded vocabulary context selector;
- short-lived cache for known vocabulary context;
- Redis cache implementation for known vocabulary context;
- database migration for the supporting progress index;
- prompt block builder;
- integration into `teacherService.chat()` and `teacherLlmService.chatStream()`;
- unit tests for selection and prompt generation.

Do not implement frontend UI, new database tables, embedding-based retrieval, versioned cache invalidation, or chat usage tracking in V1.
