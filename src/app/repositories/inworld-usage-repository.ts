import { db } from '#database/db.js';
import { inworldTtsUsage } from '#database/schema.js';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';

export type InworldTtsUsageRow = InferSelectModel<typeof inworldTtsUsage>;
export type InworldTtsUsageInsert = InferInsertModel<typeof inworldTtsUsage>;

export type TtsFeature = InworldTtsUsageRow['feature'];

export interface TtsStatRow {
    model: string;
    voice: string;
    feature: string;
    totalCalls: number;
    totalCharacters: number;
}

export interface TtsFilter {
    userId?: bigint;
    dateFrom?: Date;
    dateTo?: Date;
    feature?: TtsFeature;
}

export interface IInworldUsageRepository {
    insert(data: InworldTtsUsageInsert): Promise<void>;
    find(opts: TtsFilter & { limit: number; offset: number }): Promise<InworldTtsUsageRow[]>;
    count(filter?: TtsFilter): Promise<number>;
    getStats(): Promise<TtsStatRow[]>;
}

function buildWhere(filter: TtsFilter): SQL | undefined {
    const conditions: SQL[] = [];
    if (filter.userId !== undefined) conditions.push(eq(inworldTtsUsage.userId, filter.userId));
    if (filter.dateFrom !== undefined) conditions.push(gte(inworldTtsUsage.createdAt, filter.dateFrom));
    if (filter.dateTo !== undefined) conditions.push(lte(inworldTtsUsage.createdAt, filter.dateTo));
    if (filter.feature !== undefined) conditions.push(eq(inworldTtsUsage.feature, filter.feature));
    return conditions.length > 0 ? and(...conditions) : undefined;
}

export const inworldUsageRepository: IInworldUsageRepository = {
    async insert(data) {
        await db.insert(inworldTtsUsage).values(data);
    },

    async find({ limit, offset, ...filter }) {
        const where = buildWhere(filter);
        const base = db.select().from(inworldTtsUsage);
        const filtered = where !== undefined ? base.where(where) : base;
        return filtered.orderBy(desc(inworldTtsUsage.createdAt)).limit(limit).offset(offset);
    },

    async count(filter = {}) {
        const where = buildWhere(filter);
        const query = db.select({ count: sql<number>`count(*)` }).from(inworldTtsUsage);
        const result = await (where !== undefined ? query.where(where) : query);
        return result[0]?.count ?? 0;
    },

    async getStats() {
        const rows = await db
            .select({
                model: inworldTtsUsage.model,
                voice: inworldTtsUsage.voice,
                feature: inworldTtsUsage.feature,
                totalCalls: sql<number>`count(*)`,
                totalCharacters: sql<number>`sum(${inworldTtsUsage.characterCount})`,
            })
            .from(inworldTtsUsage)
            .groupBy(inworldTtsUsage.model, inworldTtsUsage.voice, inworldTtsUsage.feature)
            .orderBy(desc(sql`count(*)`));
        return rows.map((r) => ({
            model: r.model,
            voice: r.voice,
            feature: r.feature,
            totalCalls: r.totalCalls,
            totalCharacters: r.totalCharacters ?? 0,
        }));
    },
};
