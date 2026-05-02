import { db } from '#database/db.js';
import { supportChatHistory } from '#database/schema.js';
import { eq, desc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export type SupportChatRow = InferSelectModel<typeof supportChatHistory>;

export const supportRepository = {
    async addChatMessage(
        userId: bigint,
        role: 'user' | 'assistant',
        content: string,
        screenshots?: string[],
    ): Promise<SupportChatRow> {
        const [created] = await db
            .insert(supportChatHistory)
            .values({
                userId,
                role,
                content,
                screenshots: screenshots !== undefined && screenshots.length > 0
                    ? screenshots
                    : null,
            })
            .returning();
        if (created === undefined) {
            throw new Error('Failed to create support chat message');
        }
        return created;
    },

    async findChatHistory(userId: bigint, limit?: number): Promise<SupportChatRow[]> {
        const query = db
            .select()
            .from(supportChatHistory)
            .where(eq(supportChatHistory.userId, userId))
            .orderBy(desc(supportChatHistory.createdAt));

        const rows = limit !== undefined
            ? await query.limit(limit)
            : await query;

        return rows.reverse();
    },

    async deleteAllChatHistory(userId: bigint): Promise<number> {
        const deleted = await db
            .delete(supportChatHistory)
            .where(eq(supportChatHistory.userId, userId))
            .returning();
        return deleted.length;
    },
};
