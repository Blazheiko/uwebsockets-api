import { openaiEmbeddingAdapter } from '#app/services/ai/adapters/openai-embedding-adapter.js';
import { teacherVocabularyRepository } from '#app/repositories/teacher-vocabulary-repository.js';
import logger from '#logger';

const VOCABULARY_SIMILARITY_MAX_DISTANCE = 0.2;

function buildEmbeddingText(params: {
    topicTitle: string;
    purposeDescription: string;
    langLearning: string;
    langNative: string;
    levelCode?: string | null;
}): string {
    return [
        params.langLearning.trim(),
        params.langNative.trim(),
        params.levelCode?.trim() ?? 'any',
        params.topicTitle.trim(),
        params.purposeDescription.trim(),
    ]
        .filter((part) => part.length > 0)
        .join(' | ');
}

export const teacherVocabularyEmbeddingService = {
    isEnabled(): boolean {
        return openaiEmbeddingAdapter.isConfigured();
    },

    async embedCollection(params: {
        topicTitle: string;
        purposeDescription: string;
        langLearning: string;
        langNative: string;
        levelCode?: string | null;
    }): Promise<number[] | null> {
        if (!openaiEmbeddingAdapter.isConfigured()) {
            logger.warn('OpenAI Embedding not configured, vocabulary collection reuse disabled');
            return null;
        }

        const text = buildEmbeddingText(params);
        return openaiEmbeddingAdapter.embed(text);
    },

    async indexCollection(
        collectionId: bigint,
        params: {
            topicTitle: string;
            purposeDescription: string;
            langLearning: string;
            langNative: string;
            levelCode?: string | null;
        },
    ): Promise<void> {
        const vector = await this.embedCollection(params);
        if (vector === null) {
            return;
        }

        await teacherVocabularyRepository.setCollectionEmbedding(collectionId, vector);
    },

    getMaxDistance(): number {
        return VOCABULARY_SIMILARITY_MAX_DISTANCE;
    },
};
