import { db } from '#database/db.js';
import { translatorSessions, translatorMessages, translatorRealtimeMessages } from '#database/schema.js';
import { desc, eq, inArray } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type TranslatorSessionRow = InferSelectModel<typeof translatorSessions>;
export type TranslatorSessionInsert = InferInsertModel<typeof translatorSessions>;
export type TranslatorMessageRow = InferSelectModel<typeof translatorMessages>;
export type TranslatorMessageInsert = InferInsertModel<typeof translatorMessages>;

export interface ITranslatorRepository {
    createSession(data: TranslatorSessionInsert): Promise<TranslatorSessionRow>;
    findSessionById(id: bigint): Promise<TranslatorSessionRow | undefined>;
    findSessionsByUserId(userId: bigint): Promise<TranslatorSessionRow[]>;
    updateSessionLangs(id: bigint, langOwner: string, langOpponent: string): Promise<TranslatorSessionRow | undefined>;
    endSession(id: bigint): Promise<boolean>;
    createMessage(data: TranslatorMessageInsert): Promise<TranslatorMessageRow>;
    findMessagesBySessionId(sessionId: bigint): Promise<TranslatorMessageRow[]>;
    updateMessageTranslation(id: bigint, translatedText: string): Promise<boolean>;
    updateSessionSummary(
        id: bigint,
        titleOwner: string,
        descriptionOwner: string,
        titleOpponent: string,
        descriptionOpponent: string,
    ): Promise<boolean>;
    updateVocabularyCollectionId(sessionId: bigint, collectionId: bigint): Promise<boolean>;
    deleteSessionById(id: bigint): Promise<boolean>;
    deleteAllSessionsByUserId(userId: bigint): Promise<number>;
}

export const translatorRepository: ITranslatorRepository = {
    async createSession(data) {
        const now = new Date();
        const [created] = await db.insert(translatorSessions).values({
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create translator session');
        }
        return created;
    },

    async findSessionById(id) {
        return await db
            .select()
            .from(translatorSessions)
            .where(eq(translatorSessions.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findSessionsByUserId(userId) {
        return await db
            .select()
            .from(translatorSessions)
            .where(eq(translatorSessions.userId, userId))
            .orderBy(desc(translatorSessions.createdAt));
    },

    async updateSessionLangs(id, langOwner, langOpponent) {
        await db
            .update(translatorSessions)
            .set({ langOwner, langOpponent, updatedAt: new Date() })
            .where(eq(translatorSessions.id, id));
        return translatorRepository.findSessionById(id);
    },

    async endSession(id) {
        const updated = await db
            .update(translatorSessions)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(translatorSessions.id, id))
            .returning();
        return updated.length > 0;
    },

    async createMessage(data) {
        const [created] = await db.insert(translatorMessages).values({
            ...data,
            createdAt: data.createdAt ?? new Date(),
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create translator message');
        }
        return created;
    },

    async findMessagesBySessionId(sessionId) {
        return await db
            .select()
            .from(translatorMessages)
            .where(eq(translatorMessages.sessionId, sessionId))
            .orderBy(translatorMessages.createdAt);
    },

    async updateMessageTranslation(id, translatedText) {
        const updated = await db
            .update(translatorMessages)
            .set({ translatedText })
            .where(eq(translatorMessages.id, id))
            .returning();
        return updated.length > 0;
    },

    async updateSessionSummary(id, titleOwner, descriptionOwner, titleOpponent, descriptionOpponent) {
        const updated = await db
            .update(translatorSessions)
            .set({ titleOwner, descriptionOwner, titleOpponent, descriptionOpponent, updatedAt: new Date() })
            .where(eq(translatorSessions.id, id))
            .returning();
        return updated.length > 0;
    },

    async updateVocabularyCollectionId(sessionId, collectionId) {
        const updated = await db
            .update(translatorSessions)
            .set({ teacherVocabularyCollectionId: collectionId, updatedAt: new Date() })
            .where(eq(translatorSessions.id, sessionId))
            .returning();
        return updated.length > 0;
    },

    async deleteSessionById(id) {
        await db.delete(translatorMessages).where(eq(translatorMessages.sessionId, id));
        await db.delete(translatorRealtimeMessages).where(eq(translatorRealtimeMessages.sessionId, id));
        const deleted = await db.delete(translatorSessions).where(eq(translatorSessions.id, id)).returning();
        return deleted.length > 0;
    },

    async deleteAllSessionsByUserId(userId) {
        const sessions = await db
            .select({ id: translatorSessions.id })
            .from(translatorSessions)
            .where(eq(translatorSessions.userId, userId));
        if (sessions.length === 0) return 0;
        const sessionIds = sessions.map((s) => s.id);
        await db
            .delete(translatorMessages)
            .where(inArray(translatorMessages.sessionId, sessionIds));
        await db
            .delete(translatorRealtimeMessages)
            .where(inArray(translatorRealtimeMessages.sessionId, sessionIds));
        const deleted = await db
            .delete(translatorSessions)
            .where(eq(translatorSessions.userId, userId))
            .returning();
        return deleted.length;
    },
};
