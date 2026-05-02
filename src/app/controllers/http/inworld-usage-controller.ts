import type { HttpContext } from '#vendor/types/types.js';
import { inworldUsageService } from '#app/services/inworld-usage-service.js';
import type { TtsFilter, TtsFeature } from '#app/repositories/inworld-usage-repository.js';
import type {
    GetTtsUsageResponse,
    GetTtsStatsResponse,
} from 'shared';

const TTS_FEATURES = new Set<string>(['TEACHER_CHAT']);

function parsePagination(query: URLSearchParams): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(query.get('page') ?? '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.get('limit') ?? '50', 10) || 50));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

function parseTtsFilter(query: URLSearchParams): TtsFilter {
    const filter: TtsFilter = {};
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
    if (feature !== null && TTS_FEATURES.has(feature)) {
        filter.feature = feature as TtsFeature;
    }
    return filter;
}

export default {
    async getUsage(context: HttpContext): Promise<GetTtsUsageResponse> {
        const { page, limit, offset } = parsePagination(context.httpData.query);
        const filter = parseTtsFilter(context.httpData.query);

        const { rows, total } = await inworldUsageService.getUsage({ limit, offset, filter });

        const serialized = rows.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            model: r.model,
            voice: r.voice,
            feature: r.feature,
            characterCount: r.characterCount,
            createdAt: r.createdAt.toISOString(),
        }));

        return { status: 'success', data: { rows: serialized, total, page, limit } };
    },

    async getStats(_context: HttpContext): Promise<GetTtsStatsResponse> {
        const stats = await inworldUsageService.getStats();
        return { status: 'success', data: { stats } };
    },
};
