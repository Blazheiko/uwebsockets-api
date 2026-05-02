import { db } from '#database/db.js';
import { supportKnowledgeBase } from '#database/schema.js';
import { eq, sql, count } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export type KbRow = InferSelectModel<typeof supportKnowledgeBase>;
export interface KbArticleRow extends KbRow {
    embeddingIndexed: boolean;
}

export interface KbSearchResult {
    id: bigint;
    title: string;
    content: string;
    screenshotKey: string | null;
    screenshotMime: string | null;
    distance: number;
}

export interface KbListOptions {
    category?: string;
    limit?: number;
    offset?: number;
}

const kbArticleSelect = {
    id: supportKnowledgeBase.id,
    title: supportKnowledgeBase.title,
    content: supportKnowledgeBase.content,
    category: supportKnowledgeBase.category,
    screenshotKey: supportKnowledgeBase.screenshotKey,
    screenshotMime: supportKnowledgeBase.screenshotMime,
    isActive: supportKnowledgeBase.isActive,
    createdAt: supportKnowledgeBase.createdAt,
    updatedAt: supportKnowledgeBase.updatedAt,
    embeddingIndexed: sql<boolean>`embedding IS NOT NULL`,
};

export const supportKnowledgeRepository = {
    async findAll(opts: KbListOptions = {}): Promise<{ rows: KbArticleRow[]; total: number }> {
        const { category, limit = 50, offset = 0 } = opts;
        const whereClause = category !== undefined && category !== ''
            ? eq(supportKnowledgeBase.category, category)
            : undefined;

        const baseQuery = db.select(kbArticleSelect).from(supportKnowledgeBase);
        const [rows, totalResult] = await Promise.all([
            whereClause !== undefined
                ? baseQuery.where(whereClause).limit(limit).offset(offset)
                : baseQuery.limit(limit).offset(offset),
            whereClause !== undefined
                ? db.select({ count: count() }).from(supportKnowledgeBase).where(whereClause)
                : db.select({ count: count() }).from(supportKnowledgeBase),
        ]);

        const total = Number(totalResult[0]?.count ?? 0);
        return { rows, total };
    },

    async findById(id: bigint): Promise<KbArticleRow | undefined> {
        const rows = await db.select(kbArticleSelect)
            .from(supportKnowledgeBase)
            .where(eq(supportKnowledgeBase.id, id))
            .limit(1);
        return rows[0];
    },

    async findActiveAll(): Promise<KbRow[]> {
        return db
            .select()
            .from(supportKnowledgeBase)
            .where(eq(supportKnowledgeBase.isActive, true));
    },

    async create(data: {
        title: string;
        content: string;
        category?: string | null;
        isActive?: boolean;
    }): Promise<KbRow> {
        const [created] = await db
            .insert(supportKnowledgeBase)
            .values({
                title: data.title,
                content: data.content,
                category: data.category ?? null,
                isActive: data.isActive ?? true,
            })
            .returning();
        if (created === undefined) {
            throw new Error('Failed to create knowledge base article');
        }
        return created;
    },

    async update(id: bigint, data: {
        title?: string;
        content?: string;
        category?: string | null;
        isActive?: boolean;
    }): Promise<KbRow | undefined> {
        const [updated] = await db
            .update(supportKnowledgeBase)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(supportKnowledgeBase.id, id))
            .returning();
        return updated;
    },

    async delete(id: bigint): Promise<void> {
        await db.delete(supportKnowledgeBase).where(eq(supportKnowledgeBase.id, id));
    },

    async setScreenshot(id: bigint, key: string, mime: string): Promise<void> {
        await db
            .update(supportKnowledgeBase)
            .set({ screenshotKey: key, screenshotMime: mime, updatedAt: new Date() })
            .where(eq(supportKnowledgeBase.id, id));
    },

    async clearScreenshot(id: bigint): Promise<void> {
        await db
            .update(supportKnowledgeBase)
            .set({ screenshotKey: null, screenshotMime: null, updatedAt: new Date() })
            .where(eq(supportKnowledgeBase.id, id));
    },

    async setEmbedding(id: bigint, vector: number[]): Promise<void> {
        const vecStr = `[${vector.join(',')}]`;
        await db.execute(
            sql`UPDATE support_knowledge_base SET embedding = ${vecStr}::vector WHERE id = ${id}`,
        );
    },

    async clearEmbedding(id: bigint): Promise<void> {
        await db
            .update(supportKnowledgeBase)
            .set({ updatedAt: new Date() })
            .where(eq(supportKnowledgeBase.id, id));
        await db.execute(
            sql`UPDATE support_knowledge_base SET embedding = NULL WHERE id = ${id}`,
        );
    },

    async searchByEmbedding(queryVector: number[], limit: number): Promise<KbSearchResult[]> {
        const vecStr = `[${queryVector.join(',')}]`;
        const result = await db.execute(
            sql`
                SELECT id, title, content, screenshot_key, screenshot_mime,
                       embedding <=> ${vecStr}::vector AS distance
                FROM support_knowledge_base
                WHERE is_active = true
                  AND embedding IS NOT NULL
                ORDER BY distance ASC
                LIMIT ${limit}
            `,
        );

        return (result.rows as {
            id: bigint | string;
            title: string;
            content: string;
            screenshot_key: string | null;
            screenshot_mime: string | null;
            distance: number | string;
        }[]).map((row) => ({
            id: typeof row.id === 'string' ? BigInt(row.id) : row.id,
            title: row.title,
            content: row.content,
            screenshotKey: row.screenshot_key,
            screenshotMime: row.screenshot_mime,
            distance: typeof row.distance === 'string' ? parseFloat(row.distance) : row.distance,
        }));
    },
};
