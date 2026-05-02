import { adminOnlineHistoryService } from '#app/services/admin-online-history-service.js';
import type { HttpContext } from '#vendor/types/types.js';
import type { AdminOnlineHistoryListResponse } from 'shared/responses';

function parseOptionalDate(value: string | null): Date | undefined {
    if (value === null || value === '') return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default {
    async list(context: HttpContext): Promise<AdminOnlineHistoryListResponse> {
        const query = context.httpData.query;
        const userIdParam = query.get('userId');
        const cursorParam = query.get('cursor');
        const limitParam = query.get('limit');
        const dateFrom = parseOptionalDate(query.get('dateFrom'));
        const dateTo = parseOptionalDate(query.get('dateTo'));
        const promoCode = query.get('promoCode') ?? undefined;

        let userId: bigint | undefined;
        if (userIdParam !== null && userIdParam !== '') {
            if (!/^\d+$/.test(userIdParam)) {
                context.responseData.status = 400;
                return { status: 'error', message: 'userId must be a numeric string' };
            }
            userId = BigInt(userIdParam);
        }

        let cursor: bigint | undefined;
        if (cursorParam !== null && cursorParam !== '') {
            if (!/^\d+$/.test(cursorParam)) {
                context.responseData.status = 400;
                return { status: 'error', message: 'cursor must be a numeric string' };
            }
            cursor = BigInt(cursorParam);
        }

        let limit: number | undefined;
        if (limitParam !== null && limitParam !== '') {
            limit = Number.parseInt(limitParam, 10);
            if (Number.isNaN(limit)) {
                context.responseData.status = 400;
                return { status: 'error', message: 'limit must be a number' };
            }
        }

        const result = await adminOnlineHistoryService.listHistory({
            ...(userId !== undefined && { userId }),
            ...(cursor !== undefined && { cursor }),
            ...(dateFrom !== undefined && { dateFrom }),
            ...(dateTo !== undefined && { dateTo }),
            ...(promoCode !== undefined && promoCode.trim() !== '' && { promoCode }),
            ...(limit !== undefined && { limit }),
        });

        return {
            status: 'success',
            items: result.items,
            total: result.total,
            limit: result.limit,
            nextCursor: result.nextCursor,
            hasMore: result.hasMore,
        };
    },
};
