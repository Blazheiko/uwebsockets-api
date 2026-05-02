import { db } from '#database/db.js';
import { llmAudioUsage } from '#database/schema.js';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';

export type LlmAudioUsageRow = InferSelectModel<typeof llmAudioUsage>;
export type LlmAudioUsageInsert = InferInsertModel<typeof llmAudioUsage>;

export type AudioFeature = LlmAudioUsageRow['feature'];

export interface AudioStatRow {
    model: string;
    feature: string;
    totalCalls: number;
    totalAudioBytes: number;
    totalTextLength: number;
}

export interface AudioFilter {
    userId?: bigint;
    dateFrom?: Date;
    dateTo?: Date;
    feature?: AudioFeature;
}

export interface ILlmAudioUsageRepository {
    insert(data: LlmAudioUsageInsert): Promise<void>;
    find(opts: AudioFilter & { limit: number; offset: number }): Promise<LlmAudioUsageRow[]>;
    count(filter?: AudioFilter): Promise<number>;
    getStats(): Promise<AudioStatRow[]>;
}

function buildWhere(filter: AudioFilter): SQL | undefined {
    const conditions: SQL[] = [];
    if (filter.userId !== undefined) conditions.push(eq(llmAudioUsage.userId, filter.userId));
    if (filter.dateFrom !== undefined) conditions.push(gte(llmAudioUsage.createdAt, filter.dateFrom));
    if (filter.dateTo !== undefined) conditions.push(lte(llmAudioUsage.createdAt, filter.dateTo));
    if (filter.feature !== undefined) conditions.push(eq(llmAudioUsage.feature, filter.feature));
    return conditions.length > 0 ? and(...conditions) : undefined;
}

export const llmAudioUsageRepository: ILlmAudioUsageRepository = {
    async insert(data) {
        await db.insert(llmAudioUsage).values(data);
    },

    async find({ limit, offset, ...filter }) {
        const where = buildWhere(filter);
        const base = db.select().from(llmAudioUsage);
        const filtered = where !== undefined ? base.where(where) : base;
        return filtered.orderBy(desc(llmAudioUsage.createdAt)).limit(limit).offset(offset);
    },

    async count(filter = {}) {
        const where = buildWhere(filter);
        const query = db.select({ count: sql<number>`count(*)` }).from(llmAudioUsage);
        const result = await (where !== undefined ? query.where(where) : query);
        return result[0]?.count ?? 0;
    },

    async getStats() {
        const rows = await db
            .select({
                model: llmAudioUsage.model,
                feature: llmAudioUsage.feature,
                totalCalls: sql<number>`count(*)`,
                totalAudioBytes: sql<number>`sum(${llmAudioUsage.audioBytes})`,
                totalTextLength: sql<number>`sum(${llmAudioUsage.textLength})`,
            })
            .from(llmAudioUsage)
            .groupBy(llmAudioUsage.model, llmAudioUsage.feature)
            .orderBy(desc(sql`count(*)`));
        return rows.map((r) => ({
            model: r.model,
            feature: r.feature,
            totalCalls: r.totalCalls,
            totalAudioBytes: r.totalAudioBytes ?? 0,
            totalTextLength: r.totalTextLength ?? 0,
        }));
    },
};
