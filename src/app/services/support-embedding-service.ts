import { openaiEmbeddingAdapter } from '#app/services/ai/adapters/openai-embedding-adapter.js';
import { supportKnowledgeRepository } from '#app/repositories/support-knowledge-repository.js';
import type { KbSearchResult } from '#app/repositories/support-knowledge-repository.js';
import logger from '#logger';

export const supportEmbeddingService = {
    async indexArticle(articleId: bigint, title: string, content: string): Promise<void> {
        if (!openaiEmbeddingAdapter.isConfigured()) {
            logger.warn('OpenAI Embedding not configured, skipping indexing');
            return;
        }
        const text = `${title}\n\n${content}`;
        const vector = await openaiEmbeddingAdapter.embed(text);
        await supportKnowledgeRepository.setEmbedding(articleId, vector);
    },

    async reindexAll(): Promise<number> {
        if (!openaiEmbeddingAdapter.isConfigured()) {
            logger.warn('OpenAI Embedding not configured, skipping reindex');
            return 0;
        }

        const allRows = await supportKnowledgeRepository.findActiveAll();
        if (allRows.length === 0) return 0;

        const texts = allRows.map((a) => `${a.title}\n\n${a.content}`);
        const vectors = await openaiEmbeddingAdapter.embedBatch(texts);

        for (let i = 0; i < allRows.length; i++) {
            const article = allRows[i];
            const vector = vectors[i];
            if (article === undefined || vector === undefined) continue;
            await supportKnowledgeRepository.setEmbedding(article.id, vector);
        }

        return allRows.length;
    },

    async search(query: string, limit = 5): Promise<KbSearchResult[]> {
        if (!openaiEmbeddingAdapter.isConfigured()) {
            logger.warn('OpenAI Embedding not configured, returning empty results');
            return [];
        }
        const queryVector = await openaiEmbeddingAdapter.embed(query);
        return supportKnowledgeRepository.searchByEmbedding(queryVector, limit);
    },
};
