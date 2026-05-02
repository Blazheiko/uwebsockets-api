import type { HttpContext } from '#vendor/types/types.js';
import { llmUsageService } from '#app/services/llm-usage-service.js';
import type { TextFilter, ImageFilter, TextFeature, ImageFeature } from '#app/repositories/llm-usage-repository.js';
import type {
    GetTextUsageResponse,
    GetImageUsageResponse,
    GetUsageStatsResponse,
} from 'shared';

const TEXT_FEATURES = new Set<string>(['TRANSLATOR_TRANSLATE', 'TRANSLATOR_SUMMARY', 'TEACHER_CHAT', 'TEACHER_LESSON', 'TEACHER_FACTS', 'TEACHER_VOCABULARY', 'PROMPT_TEST']);
const IMAGE_FEATURES = new Set<string>(['AVATAR_GENERATE', 'CHAT_IMAGE_EDIT']);

function parsePagination(query: URLSearchParams): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(query.get('page') ?? '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.get('limit') ?? '50', 10) || 50));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

function parseTextFilter(query: URLSearchParams): TextFilter {
    const filter: TextFilter = {};
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
    if (feature !== null && TEXT_FEATURES.has(feature)) {
        filter.feature = feature as TextFeature;
    }
    return filter;
}

function parseImageFilter(query: URLSearchParams): ImageFilter {
    const filter: ImageFilter = {};
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
    if (feature !== null && IMAGE_FEATURES.has(feature)) {
        filter.feature = feature as ImageFeature;
    }
    return filter;
}

export default {
    async getTextUsage(context: HttpContext): Promise<GetTextUsageResponse> {
        const { page, limit, offset } = parsePagination(context.httpData.query);
        const filter = parseTextFilter(context.httpData.query);

        const { rows, total } = await llmUsageService.getTextUsage({ limit, offset, filter });

        const serialized = rows.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            model: r.model,
            feature: r.feature,
            finalPrompt: r.finalPrompt,
            promptTokens: r.promptTokens,
            completionTokens: r.completionTokens,
            totalTokens: r.totalTokens,
            createdAt: r.createdAt.toISOString(),
        }));

        return { status: 'success', data: { rows: serialized, total, page, limit } };
    },

    async getImageUsage(context: HttpContext): Promise<GetImageUsageResponse> {
        const { page, limit, offset } = parsePagination(context.httpData.query);
        const filter = parseImageFilter(context.httpData.query);

        const { rows, total } = await llmUsageService.getImageUsage({ limit, offset, filter });

        const serialized = rows.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            model: r.model,
            feature: r.feature,
            imageCount: r.imageCount,
            createdAt: r.createdAt.toISOString(),
        }));

        return { status: 'success', data: { rows: serialized, total, page, limit } };
    },

    async getStats(_context: HttpContext): Promise<GetUsageStatsResponse> {
        const { text, image } = await llmUsageService.getStats();
        return { status: 'success', data: { text, image } };
    },
};
