import type { HttpContext } from '#vendor/types/types.js';
import { grokUsageService } from '#app/services/grok-usage-service.js';
import type { GrokTtsFilter, GrokTtsFeature } from '#app/repositories/grok-usage-repository.js';
import type {
  GetGrokTtsUsageResponse,
  GetGrokTtsStatsResponse,
} from 'shared';

const GROK_TTS_FEATURES = new Set<string>(['TEACHER_CHAT', 'TEACHER_VOCABULARY', 'TEACHER_SYNTAX', 'TRANSLATOR_TRANSLATE']);

function parsePagination(query: URLSearchParams): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(query.get('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.get('limit') ?? '50', 10) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function parseFilter(query: URLSearchParams): GrokTtsFilter {
  const filter: GrokTtsFilter = {};
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
  if (feature !== null && GROK_TTS_FEATURES.has(feature)) {
    filter.feature = feature as GrokTtsFeature;
  }
  return filter;
}

export default {
  async getUsage(context: HttpContext): Promise<GetGrokTtsUsageResponse> {
    const { page, limit, offset } = parsePagination(context.httpData.query);
    const filter = parseFilter(context.httpData.query);

    const { rows, total } = await grokUsageService.getUsage({ limit, offset, filter });

    const serialized = rows.map((r) => ({
      id: String(r.id),
      userId: String(r.userId),
      voice: r.voice,
      language: r.language,
      feature: r.feature,
      characterCount: r.characterCount,
      createdAt: r.createdAt.toISOString(),
    }));

    return { status: 'success', data: { rows: serialized, total, page, limit } };
  },

  async getStats(context: HttpContext): Promise<GetGrokTtsStatsResponse> {
    const filter = parseFilter(context.httpData.query);
    const stats = await grokUsageService.getStats(filter);
    return { status: 'success', data: { stats } };
  },
};
