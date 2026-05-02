import { grokUsageRepository } from '#app/repositories/grok-usage-repository.js';
import type {
  GrokTtsUsageRow,
  GrokTtsFeature,
  GrokTtsStatRow,
  GrokTtsFilter,
} from '#app/repositories/grok-usage-repository.js';
import logger from '#logger';

export const grokUsageService = {
  record(params: {
    userId: bigint;
    voice: string;
    language: string;
    feature: GrokTtsFeature;
    characterCount: number;
  }): void {
    void grokUsageRepository.insert({
      userId: params.userId,
      voice: params.voice,
      language: params.language,
      feature: params.feature,
      characterCount: params.characterCount,
      createdAt: new Date(),
    }).catch((err: unknown) => {
      logger.warn({ err }, 'grokUsageService: failed to record TTS usage');
    });
  },

  async getUsage(opts: {
    limit: number;
    offset: number;
    filter?: GrokTtsFilter;
  }): Promise<{ rows: GrokTtsUsageRow[]; total: number }> {
    const filter = opts.filter ?? {};
    const [rows, total] = await Promise.all([
      grokUsageRepository.find({ limit: opts.limit, offset: opts.offset, ...filter }),
      grokUsageRepository.count(filter),
    ]);
    return { rows, total };
  },

  async getStats(filter?: GrokTtsFilter): Promise<GrokTtsStatRow[]> {
    return grokUsageRepository.getStats(filter ?? {});
  },
};
