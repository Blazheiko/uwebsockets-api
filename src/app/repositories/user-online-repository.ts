import { db } from '#database/db.js';
import { promoCodes, userOnline, users } from '#database/schema.js';
import logger from '#vendor/utils/logger.js';
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';

export type UserOnlineRow = InferSelectModel<typeof userOnline>;
export type UserOnlineInsert = InferInsertModel<typeof userOnline>;
export type UserOnlineUpdate = Partial<Omit<UserOnlineInsert, 'id'>>;

export interface UserOnlineHistoryFilters {
    userId?: bigint;
    dateFrom?: Date;
    dateTo?: Date;
    promoCode?: string;
    cursor?: bigint;
    limit?: number;
}

export interface IUserOnlineRepository {
    create(data: UserOnlineInsert): Promise<UserOnlineRow>;
    findBySocketUuid(socketUuid: string): Promise<UserOnlineRow | undefined>;
    completeBySocketUuid(socketUuid: string, data: UserOnlineUpdate): Promise<boolean>;
    listByUserId(userId: bigint, limit?: number): Promise<UserOnlineRow[]>;
    listHistory(filters?: UserOnlineHistoryFilters): Promise<UserOnlineRow[]>;
    countHistory(filters?: Omit<UserOnlineHistoryFilters, 'cursor' | 'limit'>): Promise<number>;
}

function buildHistoryWhereClause(filters: UserOnlineHistoryFilters | Omit<UserOnlineHistoryFilters, 'cursor' | 'limit'>): SQL | undefined {
    const conditions: SQL[] = [];

    if (filters.userId !== undefined) {
        conditions.push(eq(userOnline.userId, filters.userId));
    }

    if (filters.dateFrom !== undefined) {
        conditions.push(gte(userOnline.connectedAt, filters.dateFrom));
    }

    if (filters.dateTo !== undefined) {
        const nextDay = new Date(filters.dateTo);
        nextDay.setDate(nextDay.getDate() + 1);
        conditions.push(lt(userOnline.connectedAt, nextDay));
    }

    if (filters.promoCode !== undefined && filters.promoCode.trim() !== '') {
        conditions.push(
            sql`${userOnline.userId} IN (
                SELECT ${users.id}
                FROM ${users}
                INNER JOIN ${promoCodes} ON ${users.promoCodeId} = ${promoCodes.id}
                WHERE UPPER(${promoCodes.code}) = UPPER(${filters.promoCode.trim()})
            )`,
        );
    }

    if ('cursor' in filters && filters.cursor !== undefined) {
        conditions.push(lt(userOnline.id, filters.cursor));
    }

    if (conditions.length === 1) return conditions[0];
    if (conditions.length > 1) return and(...conditions);
    return undefined;
}

export const userOnlineRepository: IUserOnlineRepository = {
    async create(data) {
        const [row] = await db.insert(userOnline).values(data).returning();
        if (row === undefined) {
            throw new Error('Failed to create user_online row');
        }
        return row;
    },

    async findBySocketUuid(socketUuid) {
        return await db
            .select()
            .from(userOnline)
            .where(eq(userOnline.socketUuid, socketUuid))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async completeBySocketUuid(socketUuid, data) {
        const rows = await db
            .update(userOnline)
            .set(data)
            .where(eq(userOnline.socketUuid, socketUuid))
            .returning({ id: userOnline.id });

        if (rows.length === 0) {
            logger.warn({ socketUuid }, 'user_online: no record found on disconnect');
            return false;
        }

        return true;
    },

    async listByUserId(userId, limit = 50) {
        return await db
            .select()
            .from(userOnline)
            .where(eq(userOnline.userId, userId))
            .orderBy(desc(userOnline.connectedAt))
            .limit(limit);
    },

    async listHistory(filters = {}) {
        const limit = Math.min(Math.max(filters.limit ?? 100, 1), 100);
        const whereClause = buildHistoryWhereClause(filters);

        return await db
            .select()
            .from(userOnline)
            .where(whereClause)
            .orderBy(desc(userOnline.id))
            .limit(limit);
    },

    async countHistory(filters = {}) {
        const whereClause = buildHistoryWhereClause(filters);
        const rows = await db
            .select({ total: count() })
            .from(userOnline)
            .where(whereClause);

        return rows.at(0)?.total ?? 0;
    },
};
