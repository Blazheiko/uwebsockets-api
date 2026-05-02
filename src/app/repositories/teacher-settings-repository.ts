import { db } from '#database/db.js';
import { teacherSettings } from '#database/schema.js';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export type TeacherSettingsRow = InferSelectModel<typeof teacherSettings>;

export interface TeacherSettingsUpsertData {
    langNative: string;
    langLearning: string;
    topic: string;
    teacherVoice: string;
    teacherVoiceGender: string;
    teacherName: string;
    ownVoice: string;
    ownVoiceGender: string;
    proficiencyLevel: string;
    learningGoal: string;
}

export const teacherSettingsRepository = {
    async findByUserId(userId: bigint): Promise<TeacherSettingsRow | undefined> {
        return await db
            .select()
            .from(teacherSettings)
            .where(eq(teacherSettings.userId, userId))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async createWithDefaults(
        userId: bigint,
        langLearning: string,
        langNative?: string,
    ): Promise<void> {
        await db.insert(teacherSettings).values({
            userId,
            langLearning,
            ...(langNative !== undefined ? { langNative } : {}),
        });
    },

    async upsert(userId: bigint, data: TeacherSettingsUpsertData): Promise<TeacherSettingsRow> {
        const existing = await teacherSettingsRepository.findByUserId(userId);
        const now = new Date();
        if (existing !== undefined) {
            await db
                .update(teacherSettings)
                .set({
                    langNative: data.langNative,
                    langLearning: data.langLearning,
                    topic: data.topic,
                    teacherVoice: data.teacherVoice,
                    teacherVoiceGender: data.teacherVoiceGender,
                    teacherName: data.teacherName,
                    ownVoice: data.ownVoice,
                    ownVoiceGender: data.ownVoiceGender,
                    proficiencyLevel: data.proficiencyLevel,
                    learningGoal: data.learningGoal,
                    updatedAt: now,
                })
                .where(eq(teacherSettings.userId, userId));
            const updated = await teacherSettingsRepository.findByUserId(userId);
            if (updated === undefined) {
                throw new Error('Failed to update teacher settings');
            }
            return updated;
        }
        const [created] = await db.insert(teacherSettings).values({
            userId,
            langNative: data.langNative,
            langLearning: data.langLearning,
            topic: data.topic,
            teacherVoice: data.teacherVoice,
            teacherVoiceGender: data.teacherVoiceGender,
            teacherName: data.teacherName,
            ownVoice: data.ownVoice,
            ownVoiceGender: data.ownVoiceGender,
            proficiencyLevel: data.proficiencyLevel,
            learningGoal: data.learningGoal,
            createdAt: now,
            updatedAt: now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create teacher settings');
        }
        return created;
    },
};
