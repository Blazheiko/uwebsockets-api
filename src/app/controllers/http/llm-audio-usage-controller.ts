import type { HttpContext } from '#vendor/types/types.js';
import { llmAudioUsageService } from '#app/services/llm-audio-usage-service.js';
import type { AudioFilter, AudioFeature } from '#app/repositories/llm-audio-usage-repository.js';
import type {
    GetAudioUsageResponse,
    GetAudioStatsResponse,
} from 'shared';

const AUDIO_FEATURES = new Set<string>(['TEACHER_STT', 'TRANSLATOR_STT']);

function parsePagination(query: URLSearchParams): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(query.get('page') ?? '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.get('limit') ?? '50', 10) || 50));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

function parseAudioFilter(query: URLSearchParams): AudioFilter {
    const filter: AudioFilter = {};
    const userId = query.get('userId');
    if (userId !== null && userId.trim().length > 0) {
        try { filter.userId = BigInt(userId.trim()); } catch { /* ignore invalid */ }
    }
    const dateFrom = query.get('dateFrom');
    if (dateFrom !== null && dateFrom.trim().length > 0) {
        const d = new Date(dateFrom.trim());
        if (!isNaN(d.getTime())) filter.dateFrom = d;
    }
    const dateTo = query.get('dateTo');
    if (dateTo !== null && dateTo.trim().length > 0) {
        const d = new Date(dateTo.trim());
        if (!isNaN(d.getTime())) filter.dateTo = d;
    }
    const feature = query.get('feature');
    if (feature !== null && AUDIO_FEATURES.has(feature)) {
        filter.feature = feature as AudioFeature;
    }
    return filter;
}

export default {
    async getUsage(context: HttpContext): Promise<GetAudioUsageResponse> {
        const { page, limit, offset } = parsePagination(context.httpData.query);
        const filter = parseAudioFilter(context.httpData.query);

        const { rows, total } = await llmAudioUsageService.getUsage({ limit, offset, filter });

        const serialized = rows.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            model: r.model,
            feature: r.feature,
            audioBytes: r.audioBytes,
            textLength: r.textLength,
            createdAt: r.createdAt.toISOString(),
        }));

        return { status: 'success', data: { rows: serialized, total, page, limit } };
    },

    async getStats(_context: HttpContext): Promise<GetAudioStatsResponse> {
        const stats = await llmAudioUsageService.getStats();
        return { status: 'success', data: { stats } };
    },
};
