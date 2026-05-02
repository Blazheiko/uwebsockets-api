import { db } from '#database/db.js';
import { grokTtsUsage } from '#database/schema.js';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';

export type GrokTtsUsageRow = InferSelectModel<typeof grokTtsUsage>;
export type GrokTtsUsageInsert = InferInsertModel<typeof grokTtsUsage>;

export type GrokTtsFeature = GrokTtsUsageRow['feature'];

export interface GrokTtsStatRow {
  voice: string;
  language: string;
  feature: string;
  totalCalls: number;
  totalCharacters: number;
}

export interface GrokTtsFilter {
  userId?: bigint;
  dateFrom?: Date;
  dateTo?: Date;
  feature?: GrokTtsFeature;
}

function buildWhere(filter: GrokTtsFilter): SQL | undefined {
  const conditions: SQL[] = [];
  if (filter.userId !== undefined) conditions.push(eq(grokTtsUsage.userId, filter.userId));
  if (filter.dateFrom !== undefined) conditions.push(gte(grokTtsUsage.createdAt, filter.dateFrom));
  if (filter.dateTo !== undefined) conditions.push(lte(grokTtsUsage.createdAt, filter.dateTo));
  if (filter.feature !== undefined) conditions.push(eq(grokTtsUsage.feature, filter.feature));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export const grokUsageRepository = {
  async insert(data: GrokTtsUsageInsert): Promise<void> {
    await db.insert(grokTtsUsage).values(data);
  },

  async find(opts: GrokTtsFilter & { limit: number; offset: number }): Promise<GrokTtsUsageRow[]> {
    const { limit, offset, ...filter } = opts;
    const where = buildWhere(filter);
    const base = db.select().from(grokTtsUsage);
    const filtered = where !== undefined ? base.where(where) : base;
    return filtered.orderBy(desc(grokTtsUsage.createdAt)).limit(limit).offset(offset);
  },

  async count(filter: GrokTtsFilter = {}): Promise<number> {
    const where = buildWhere(filter);
    const query = db.select({ count: sql<number>`count(*)` }).from(grokTtsUsage);
    const result = await (where !== undefined ? query.where(where) : query);
    return result[0]?.count ?? 0;
  },

  async getStats(filter: GrokTtsFilter = {}): Promise<GrokTtsStatRow[]> {
    const where = buildWhere(filter);
    const base = db
      .select({
        voice: grokTtsUsage.voice,
        language: grokTtsUsage.language,
        feature: grokTtsUsage.feature,
        totalCalls: sql<number>`count(*)`,
        totalCharacters: sql<number>`sum(${grokTtsUsage.characterCount})`,
      })
      .from(grokTtsUsage);
    const rows = await (where !== undefined ? base.where(where) : base)
      .groupBy(grokTtsUsage.voice, grokTtsUsage.language, grokTtsUsage.feature)
      .orderBy(desc(sql`count(*)`))
      .limit(500);
    return rows.map((r) => ({
      voice: r.voice,
      language: r.language,
      feature: r.feature,
      totalCalls: Number(r.totalCalls),
      totalCharacters: Number(r.totalCharacters ?? 0),
    }));
  },
};
