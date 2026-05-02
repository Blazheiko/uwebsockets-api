import { db } from '#database/db.js';
import { llmSystemPrompts } from '#database/schema.js';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export type PromptRow = InferSelectModel<typeof llmSystemPrompts>;
export type PromptType = PromptRow['type'];

export interface PromptUpdate {
    content?: string;
    model?: string | null;
    temperature?: number | null;
    maxTokens?: number | null;
}

export interface IPromptRepository {
    findAll(): Promise<PromptRow[]>;
    findByType(type: PromptType): Promise<PromptRow | undefined>;
    update(type: PromptType, data: PromptUpdate): Promise<boolean>;
}

export const promptRepository: IPromptRepository = {
    async findAll() {
        return await db.select().from(llmSystemPrompts);
    },

    async findByType(type) {
        return await db
            .select()
            .from(llmSystemPrompts)
            .where(eq(llmSystemPrompts.type, type))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async update(type, data) {
        if (Object.keys(data).length === 0) return true;
        const updated = await db
            .update(llmSystemPrompts)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(llmSystemPrompts.type, type))
            .returning();
        return updated.length > 0;
    },
};
