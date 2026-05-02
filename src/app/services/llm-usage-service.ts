import { llmUsageRepository } from '#app/repositories/llm-usage-repository.js';
import type {
    LlmTextUsageRow,
    LlmImageUsageRow,
    TextFeature,
    ImageFeature,
    TextStatRow,
    ImageStatRow,
    TextFilter,
    ImageFilter,
} from '#app/repositories/llm-usage-repository.js';
import logger from '#logger';

export const llmUsageService = {
    recordText(params: {
        userId: bigint;
        llmSystemPromptId: bigint | null;
        model: string;
        feature: TextFeature;
        finalPrompt: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }): void {
        void llmUsageRepository.insertText({
            userId: params.userId,
            llmSystemPromptId: params.llmSystemPromptId ?? undefined,
            model: params.model,
            feature: params.feature,
            finalPrompt: params.finalPrompt,
            promptTokens: params.promptTokens,
            completionTokens: params.completionTokens,
            totalTokens: params.totalTokens,
            createdAt: new Date(),
        }).catch((err: unknown) => {
            logger.warn({ err }, 'llmUsageService: failed to record text usage');
        });
    },

    recordImage(params: {
        userId: bigint;
        llmSystemPromptId: bigint | null;
        model: string;
        feature: ImageFeature;
        imageCount?: number;
    }): void {
        void llmUsageRepository.insertImage({
            userId: params.userId,
            llmSystemPromptId: params.llmSystemPromptId ?? undefined,
            model: params.model,
            feature: params.feature,
            imageCount: params.imageCount ?? 1,
            createdAt: new Date(),
        }).catch((err: unknown) => {
            logger.warn({ err }, 'llmUsageService: failed to record image usage');
        });
    },

    async getTextUsage(opts: {
        limit: number;
        offset: number;
        filter?: TextFilter;
    }): Promise<{ rows: LlmTextUsageRow[]; total: number }> {
        const filter = opts.filter ?? {};
        const [rows, total] = await Promise.all([
            llmUsageRepository.findText({ limit: opts.limit, offset: opts.offset, ...filter }),
            llmUsageRepository.countText(filter),
        ]);
        return { rows, total };
    },

    async getImageUsage(opts: {
        limit: number;
        offset: number;
        filter?: ImageFilter;
    }): Promise<{ rows: LlmImageUsageRow[]; total: number }> {
        const filter = opts.filter ?? {};
        const [rows, total] = await Promise.all([
            llmUsageRepository.findImage({ limit: opts.limit, offset: opts.offset, ...filter }),
            llmUsageRepository.countImage(filter),
        ]);
        return { rows, total };
    },

    async getStats(): Promise<{ text: TextStatRow[]; image: ImageStatRow[] }> {
        const [text, image] = await Promise.all([
            llmUsageRepository.getTextStats(),
            llmUsageRepository.getImageStats(),
        ]);
        return { text, image };
    },
};
