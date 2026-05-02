import { llmAudioUsageRepository } from '#app/repositories/llm-audio-usage-repository.js';
import type {
    LlmAudioUsageRow,
    AudioFeature,
    AudioStatRow,
    AudioFilter,
} from '#app/repositories/llm-audio-usage-repository.js';
import logger from '#logger';

export const llmAudioUsageService = {
    record(params: {
        userId: bigint;
        model: string;
        feature: AudioFeature;
        audioBytes: number;
        textLength: number;
    }): void {
        void llmAudioUsageRepository.insert({
            userId: params.userId,
            model: params.model,
            feature: params.feature,
            audioBytes: params.audioBytes,
            textLength: params.textLength,
            createdAt: new Date(),
        }).catch((err: unknown) => {
            logger.warn({ err }, 'llmAudioUsageService: failed to record STT usage');
        });
    },

    async getUsage(opts: {
        limit: number;
        offset: number;
        filter?: AudioFilter;
    }): Promise<{ rows: LlmAudioUsageRow[]; total: number }> {
        const filter = opts.filter ?? {};
        const [rows, total] = await Promise.all([
            llmAudioUsageRepository.find({ limit: opts.limit, offset: opts.offset, ...filter }),
            llmAudioUsageRepository.count(filter),
        ]);
        return { rows, total };
    },

    async getStats(): Promise<AudioStatRow[]> {
        return llmAudioUsageRepository.getStats();
    },
};
