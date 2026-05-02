import { userOnlineRepository, userRepository } from '#app/repositories/index.js';
import logger from '#vendor/utils/logger.js';

interface AdminOnlineHistoryFilters {
    userId?: bigint;
    dateFrom?: Date;
    dateTo?: Date;
    promoCode?: string;
    cursor?: bigint;
    limit?: number;
}

export interface AdminOnlineHistoryItem {
    id: string;
    userId: string;
    name: string;
    email: string;
    promoCode: string | null;
    appType: 'web' | 'pwa' | null;
    connectedAt: string;
    disconnectedAt: string | null;
    connectionDurationMs: number | null;
    closeCode: number | null;
    isFirstConnection: boolean;
    isLastConnection: boolean | null;
    userAgent: string | null;
    ipAddress: string | null;
}

export const adminOnlineHistoryService = {
    async listHistory(filters: AdminOnlineHistoryFilters): Promise<{
        items: AdminOnlineHistoryItem[];
        total: number;
        limit: number;
        nextCursor: string | null;
        hasMore: boolean;
    }> {
        const limit = Math.min(Math.max(filters.limit ?? 100, 1), 100);
        const countFilters = {
            ...(filters.userId !== undefined && { userId: filters.userId }),
            ...(filters.dateFrom !== undefined && { dateFrom: filters.dateFrom }),
            ...(filters.dateTo !== undefined && { dateTo: filters.dateTo }),
            ...(filters.promoCode !== undefined && { promoCode: filters.promoCode }),
        };

        const [rows, total] = await Promise.all([
            userOnlineRepository.listHistory({ ...filters, limit: limit + 1 }),
            userOnlineRepository.countHistory(countFilters),
        ]);

        const hasMore = rows.length > limit;
        const pageRows = hasMore ? rows.slice(0, limit) : rows;
        const lastRow = pageRows.at(-1);
        const nextCursor = hasMore && lastRow !== undefined ? String(lastRow.id) : null;
        const userIds = Array.from(new Set(pageRows.map((row) => row.userId)));
        const users = userIds.length > 0
            ? await userRepository.findAdminOnlineUsersByIds(userIds)
            : [];
        const usersById = new Map(users.map((user) => [String(user.id), user]));

        return {
            items: pageRows
                .map((row) => {
                    const user = usersById.get(String(row.userId));
                    if (user === undefined) {
                        logger.warn(
                            { historyId: String(row.id), userId: String(row.userId) },
                            'admin_online_history: user not found for history row',
                        );
                        return null;
                    }

                    const disconnectedAt = row.disconnectedAt;
                    const storedDuration = row.connectionDurationMs;
                    const fallbackDuration = disconnectedAt !== null
                        ? Math.max(0, disconnectedAt.getTime() - row.connectedAt.getTime())
                        : null;

                    return {
                        id: String(row.id),
                        userId: String(row.userId),
                        name: user.name,
                        email: user.email,
                        promoCode: user.promoCode,
                        appType: row.typeApp,
                        connectedAt: row.connectedAt.toISOString(),
                        disconnectedAt: disconnectedAt?.toISOString() ?? null,
                        connectionDurationMs: storedDuration ?? fallbackDuration,
                        closeCode: row.closeCode,
                        isFirstConnection: row.isFirstConnection,
                        isLastConnection: row.isLastConnection,
                        userAgent: row.userAgent,
                        ipAddress: row.ipAddress,
                    };
                })
                .filter((row): row is AdminOnlineHistoryItem => row !== null),
            total,
            limit,
            nextCursor,
            hasMore,
        };
    },
};
