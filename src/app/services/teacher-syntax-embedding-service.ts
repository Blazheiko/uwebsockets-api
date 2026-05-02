import { openaiEmbeddingAdapter } from '#app/services/ai/adapters/openai-embedding-adapter.js';
import { teacherSyntaxRepository } from '#app/repositories/teacher-syntax-repository.js';
import logger from '#logger';

function buildEmbeddingText(params: {
    sourceTopic: string;
    topicTitle?: string;
    ruleSummary?: string;
}): string {
    return [
        params.sourceTopic.trim(),
        params.topicTitle?.trim() ?? '',
        params.ruleSummary?.trim() ?? '',
    ]
        .filter((part) => part.length > 0)
        .join('\n\n');
}

export const teacherSyntaxEmbeddingService = {
    isEnabled(): boolean {
        return openaiEmbeddingAdapter.isConfigured();
    },

    async embedTopic(params: {
        sourceTopic: string;
        topicTitle?: string;
        ruleSummary?: string;
    }): Promise<number[] | null> {
        if (!openaiEmbeddingAdapter.isConfigured()) {
            logger.warn('OpenAI Embedding not configured, syntax lesson reuse disabled');
            return null;
        }

        const text = buildEmbeddingText(params);
        return openaiEmbeddingAdapter.embed(text);
    },

    async indexLesson(
        lessonId: bigint,
        params: {
            sourceTopic: string;
            topicTitle?: string;
            ruleSummary?: string;
        },
    ): Promise<void> {
        const vector = await this.embedTopic(params);
        if (vector === null) {
            return;
        }

        await teacherSyntaxRepository.setLessonEmbedding(lessonId, vector);
    },
};
