# Support Query Translation Plan

## Context

On the support page, the user can ask a question in their own language, but the current knowledge base retrieval flow builds an embedding directly from the original message text.

Because of that, when the user asks a question in a language different from the language used in `support_knowledge_base`, semantic search may return no relevant articles even when the answer exists in the knowledge base.

## Current Flow

The current support chat flow works like this:

1. The backend receives the original user message.
2. The message is stored in support chat history.
3. The same original message is passed into embedding search.
4. The backend searches `support_knowledge_base` by vector similarity.
5. Retrieved articles are injected into the LLM prompt.
6. The assistant responds in the user's native language.

Current implementation details:

- Support chat calls embedding search with the original message in [packages/backend/src/app/services/support-service.ts](/Users/aleksandrblazheiko/NodeJs/itvibe-party/packages/backend/src/app/services/support-service.ts#L252).
- Embedding search directly embeds the incoming query in [packages/backend/src/app/services/support-embedding-service.ts](/Users/aleksandrblazheiko/NodeJs/itvibe-party/packages/backend/src/app/services/support-embedding-service.ts#L39).
- Knowledge base articles are indexed from `title + content` without query-language normalization in [packages/backend/src/app/services/support-embedding-service.ts](/Users/aleksandrblazheiko/NodeJs/itvibe-party/packages/backend/src/app/services/support-embedding-service.ts#L7).

## Problem Statement

If the knowledge base is primarily in English and the user asks in another language, the search query embedding is generated from the non-English phrase. This reduces the probability of matching the English knowledge base content and causes missed search hits.

Example:

- User question: Russian, Ukrainian, French, etc.
- KB article: English
- Search query embedding: built from non-English text
- Result: relevant article may not be found

## Goal

Before running embedding search for support requests:

1. translate the user question into English;
2. build the embedding from the English version;
3. search `support_knowledge_base` using that English embedding;
4. keep the original user message for chat history and final answer generation.

## Proposed Solution

### Main Change

Insert a translation step into the support retrieval pipeline before calling embedding search.

Target behavior:

1. User sends a message in any language.
2. Backend stores the original message unchanged.
3. Backend translates the message into English.
4. Backend builds an embedding from the English text.
5. Backend searches `support_knowledge_base`.
6. Backend sends the original user message plus KB context into the support LLM.
7. Support LLM answers in the user's native language as it already does now.

### Why Backend Instead of Frontend

This should be implemented on the backend, not on the support page UI.

Reasons:

- The support retrieval contract should be consistent for all clients.
- Any future client using the same WebSocket route will benefit automatically.
- Retrieval quality should not depend on frontend behavior.
- The existing search and LLM orchestration already lives in backend services.

## Recommended Implementation Plan

### 1. Add a dedicated support query translation service

Create a small backend service responsible only for turning an arbitrary support query into an English retrieval query.

Responsibilities:

- accept raw user message text;
- translate to English unconditionally — the LLM will return the text unchanged if it is already in English, so no language detection is needed;
- return a concise English phrase suitable for embedding search;
- avoid explanations, metadata, quotes, or additional text.

Prompt guidance:

```
Translate the following user support question into English.
Return ONLY the English translation, nothing else.
If the text is already in English, return it unchanged.
```

Recommended approach:

- reuse the same `getTextAdapterForModel(...)` adapter selection strategy already used by translator flows;
- collect the streaming output into a plain string (no new non-streaming interface required — `ITextAdapter` only exposes `streamText`);
- keep this service independent from translator session logic, streaming, broadcast events, and translator DB state.

This avoids coupling support retrieval to the full translator feature workflow.

### 2. Update support chat flow

Modify [packages/backend/src/app/services/support-service.ts](/Users/aleksandrblazheiko/NodeJs/itvibe-party/packages/backend/src/app/services/support-service.ts#L252).

New flow inside `supportService.chat(...)`:

1. save original user message to history;
2. run translation and chat history load **in parallel** (`Promise.all`), since history load does not depend on the translation result;
3. call `supportEmbeddingService.search(englishQuery, 5)` after translation resolves;
4. keep passing the original `message` into `supportLlmService.chatStream(...)`.

```ts
const [englishQuery, chatHistory] = await Promise.all([
    supportQueryTranslationService.translateToEnglish(message),
    supportRepository.findChatHistory(userId, 20),
]);
const searchResults = await supportEmbeddingService.search(englishQuery, 5);
```

Important rule:

- retrieval should use the English query;
- answer generation should still use the original user message.

This preserves natural user interaction while improving KB matching.

### 3. Keep the database schema unchanged for phase one

For the current task, no schema change is required.

The immediate issue is query-side mismatch, so translating the query before embedding is enough for the first implementation.

No required changes:

- no new column in `support_knowledge_base`;
- no migration required;
- no mandatory KB reimport if the existing KB content is already English.

### 4. Reuse existing AI infrastructure

The repository already contains translation-oriented logic in [packages/backend/src/app/services/translator-llm-service.ts](/Users/aleksandrblazheiko/NodeJs/itvibe-party/packages/backend/src/app/services/translator-llm-service.ts#L24).

Recommended implementation direction:

- reuse the same `getTextAdapterForModel(...)` adapter selection strategy;
- collect streaming tokens into a single string — `ITextAdapter` exposes only `streamText`, no separate non-streaming method needed;
- use a narrow prompt that instructs the LLM to return English only, with no extra text.

This keeps the implementation aligned with the current architecture and avoids duplicating provider integration code.

### 5. Add safe fallback behavior

If translation fails for any reason:

- log the error;
- fall back to the original user message for embedding search;
- continue the support flow without blocking the answer.

This ensures the feature improves retrieval when available, but does not create a hard failure path for support chat.

### 6. Add observability

Add one structured `logger.info` call after the translation step:

```ts
logger.info({
    originalQuery: message,
    englishQuery,
    translated: englishQuery !== message,
}, 'Support: query prepared for embedding search');
```

Log errors separately via `logger.error` in the fallback branch.

This will make production verification much easier.

## Detailed Change Scope

### Files likely to change

- [packages/backend/src/app/services/support-service.ts](/Users/aleksandrblazheiko/NodeJs/itvibe-party/packages/backend/src/app/services/support-service.ts)
- [packages/backend/src/app/services/support-embedding-service.ts](/Users/aleksandrblazheiko/NodeJs/itvibe-party/packages/backend/src/app/services/support-embedding-service.ts)
- new service file for support query translation under `packages/backend/src/app/services/`
- optional prompt definitions if support translation should be configurable through prompt storage

### Files not expected to change in phase one

- DB schema for `support_knowledge_base`
- frontend support page contract
- support WebSocket input schema

## Testing Plan

There does not appear to be existing support-specific automated coverage, so the implementation should include focused tests for the new retrieval step.

Minimum recommended cases:

1. Non-English user message is translated to English before search.
2. English user message can pass through without harmful transformation.
3. If translation fails, search uses the original message.
4. `supportLlmService.chatStream(...)` still receives the original user message.
5. Retrieved KB context still flows into the support answer prompt as before.

## Risks

### 1. Translation quality risk

If the translation step produces an inaccurate English query, retrieval quality may still suffer.

Mitigation:

- keep the prompt narrow;
- request only a concise English reformulation;
- avoid extra paraphrasing beyond necessary translation.

### 2. Latency increase

An extra model call before retrieval adds latency.

Mitigation:

- keep translation non-streaming and short;
- use a lightweight model where appropriate;
- log timing and evaluate real impact after rollout.

### 3. Mixed-language knowledge base

If `support_knowledge_base` contains multiple languages instead of mostly English content, query translation alone may not fully solve retrieval quality.

Mitigation:

- phase one: translate query to English;
- phase two if needed: store normalized English article text for embeddings, or move to a stronger multilingual retrieval strategy.

## Rollout Strategy

### Phase 1

- implement query-to-English translation before search;
- keep all existing KB content and retrieval storage unchanged;
- verify behavior manually with multilingual support queries.

### Phase 2 if needed

- evaluate whether KB content itself should also be normalized to English for indexing;
- consider adding a dedicated indexed English text field or a multilingual embedding strategy.

## Expected Result

After implementation:

- a user can ask a support question in their own language;
- the backend will translate that question into English for retrieval;
- embedding search in `support_knowledge_base` will use the English phrase;
- the final support answer will still be generated in the user's language.

This should significantly improve knowledge base hit rate for multilingual support requests without changing the user-facing support interaction model.
