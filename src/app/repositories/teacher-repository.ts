import { db } from '#database/db.js';
import {
    teacherStudentProfiles,
    teacherStudentFacts,
    teacherLessons,
    teacherChatHistory,
} from '#database/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type TeacherProfileRow = InferSelectModel<typeof teacherStudentProfiles>;
export type TeacherProfileInsert = InferInsertModel<typeof teacherStudentProfiles>;
export type TeacherFactRow = InferSelectModel<typeof teacherStudentFacts>;
export type TeacherFactInsert = InferInsertModel<typeof teacherStudentFacts>;
export type TeacherLessonRow = InferSelectModel<typeof teacherLessons>;
export type TeacherLessonInsert = InferInsertModel<typeof teacherLessons>;
export type TeacherChatMessageRow = InferSelectModel<typeof teacherChatHistory>;
export type TeacherChatMessageInsert = InferInsertModel<typeof teacherChatHistory>;

export type TeacherProfileUpdate = Partial<Pick<
    TeacherProfileRow,
    'level' | 'interests' | 'summary' | 'totalLessons' | 'totalWords'
>>;

export interface ITeacherRepository {
    upsertProfile(userId: bigint, langLearning: string, langNative: string): Promise<TeacherProfileRow>;
    updateProfile(userId: bigint, langLearning: string, partial: TeacherProfileUpdate): Promise<boolean>;
    findProfile(userId: bigint, langLearning: string): Promise<TeacherProfileRow | undefined>;
    addFact(userId: bigint, langLearning: string, fact: string, sourceSessionId?: bigint): Promise<TeacherFactRow>;
    findFacts(userId: bigint, langLearning: string): Promise<TeacherFactRow[]>;
    deleteAllFacts(userId: bigint): Promise<number>;
    deleteAllProfiles(userId: bigint): Promise<number>;
    createLesson(data: TeacherLessonInsert): Promise<TeacherLessonRow>;
    findLessons(userId: bigint, langLearning: string, limit?: number): Promise<TeacherLessonRow[]>;
    findLessonById(id: bigint): Promise<TeacherLessonRow | undefined>;
    findLessonBySessionId(sessionId: bigint, userId: bigint): Promise<TeacherLessonRow | undefined>;
    deleteAllLessons(userId: bigint): Promise<number>;
    addChatMessage(userId: bigint, langLearning: string, role: 'user' | 'assistant', content: string): Promise<TeacherChatMessageRow>;
    findRecentChatHistory(userId: bigint, langLearning: string, limit?: number): Promise<TeacherChatMessageRow[]>;
    deleteAllChatHistory(userId: bigint): Promise<number>;
}

export const teacherRepository: ITeacherRepository = {
    async upsertProfile(userId, langLearning, langNative) {
        const existing = await teacherRepository.findProfile(userId, langLearning);
        if (existing !== undefined) {
            return existing;
        }
        const now = new Date();
        const [created] = await db.insert(teacherStudentProfiles).values({
            userId,
            langLearning,
            langNative,
            createdAt: now,
            updatedAt: now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create teacher student profile');
        }
        return created;
    },

    async updateProfile(userId, langLearning, partial) {
        if (Object.keys(partial).length === 0) return true;
        const updated = await db
            .update(teacherStudentProfiles)
            .set({ ...partial, updatedAt: new Date() })
            .where(
                and(
                    eq(teacherStudentProfiles.userId, userId),
                    eq(teacherStudentProfiles.langLearning, langLearning),
                ),
            )
            .returning();
        return updated.length > 0;
    },

    async findProfile(userId, langLearning) {
        return await db
            .select()
            .from(teacherStudentProfiles)
            .where(
                and(
                    eq(teacherStudentProfiles.userId, userId),
                    eq(teacherStudentProfiles.langLearning, langLearning),
                ),
            )
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async addFact(userId, langLearning, fact, sourceSessionId) {
        const [created] = await db.insert(teacherStudentFacts).values({
            userId,
            langLearning,
            fact,
            sourceSessionId: sourceSessionId ?? null,
            createdAt: new Date(),
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create teacher student fact');
        }
        return created;
    },

    async findFacts(userId, langLearning) {
        return await db
            .select()
            .from(teacherStudentFacts)
            .where(
                and(
                    eq(teacherStudentFacts.userId, userId),
                    eq(teacherStudentFacts.langLearning, langLearning),
                ),
            )
            .orderBy(desc(teacherStudentFacts.createdAt))
            .limit(30);
    },

    async createLesson(data) {
        const [created] = await db.insert(teacherLessons).values({
            ...data,
            createdAt: data.createdAt ?? new Date(),
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create teacher lesson');
        }
        return created;
    },

    async findLessons(userId, langLearning, limit = 20) {
        return await db
            .select()
            .from(teacherLessons)
            .where(
                and(
                    eq(teacherLessons.userId, userId),
                    eq(teacherLessons.langLearning, langLearning),
                ),
            )
            .orderBy(desc(teacherLessons.createdAt))
            .limit(limit);
    },

    async findLessonById(id) {
        return await db
            .select()
            .from(teacherLessons)
            .where(eq(teacherLessons.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findLessonBySessionId(sessionId, userId) {
        return await db
            .select()
            .from(teacherLessons)
            .where(
                and(
                    eq(teacherLessons.sessionId, sessionId),
                    eq(teacherLessons.userId, userId),
                ),
            )
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async addChatMessage(userId, langLearning, role, content) {
        const [created] = await db.insert(teacherChatHistory).values({
            userId,
            langLearning,
            role,
            content,
            createdAt: new Date(),
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create teacher chat message');
        }
        return created;
    },

    async findRecentChatHistory(userId, langLearning, limit = 20) {
        const rows = await db
            .select()
            .from(teacherChatHistory)
            .where(
                and(
                    eq(teacherChatHistory.userId, userId),
                    eq(teacherChatHistory.langLearning, langLearning),
                ),
            )
            .orderBy(desc(teacherChatHistory.createdAt))
            .limit(limit);
        return rows.reverse();
    },

    async deleteAllChatHistory(userId) {
        const deleted = await db
            .delete(teacherChatHistory)
            .where(eq(teacherChatHistory.userId, userId))
            .returning();
        return deleted.length;
    },

    async deleteAllFacts(userId) {
        const deleted = await db
            .delete(teacherStudentFacts)
            .where(eq(teacherStudentFacts.userId, userId))
            .returning();
        return deleted.length;
    },

    async deleteAllProfiles(userId) {
        const deleted = await db
            .delete(teacherStudentProfiles)
            .where(eq(teacherStudentProfiles.userId, userId))
            .returning();
        return deleted.length;
    },

    async deleteAllLessons(userId) {
        const deleted = await db
            .delete(teacherLessons)
            .where(eq(teacherLessons.userId, userId))
            .returning();
        return deleted.length;
    },
};
