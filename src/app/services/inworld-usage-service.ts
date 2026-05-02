import { inworldUsageRepository } from '#app/repositories/inworld-usage-repository.js';
import type {
    InworldTtsUsageRow,
    TtsFeature,
    TtsStatRow,
    TtsFilter,
} from '#app/repositories/inworld-usage-repository.js';
import logger from '#logger';

export const inworldUsageService = {
    record(params: {
        userId: bigint;
        model: string;
        voice: string;
        feature: TtsFeature;
        characterCount: number;
    }): void {
        void inworldUsageRepository.insert({
            userId: params.userId,
            model: params.model,
            voice: params.voice,
            feature: params.feature,
            characterCount: params.characterCount,
            createdAt: new Date(),
        }).catch((err: unknown) => {
            logger.warn({ err }, 'inworldUsageService: failed to record TTS usage');
        });
    },

    async getUsage(opts: {
        limit: number;
        offset: number;
        filter?: TtsFilter;
    }): Promise<{ rows: InworldTtsUsageRow[]; total: number }> {
        const filter = opts.filter ?? {};
        const [rows, total] = await Promise.all([
            inworldUsageRepository.find({ limit: opts.limit, offset: opts.offset, ...filter }),
            inworldUsageRepository.count(filter),
        ]);
        return { rows, total };
    },

    async getStats(): Promise<TtsStatRow[]> {
        return inworldUsageRepository.getStats();
    },
};
