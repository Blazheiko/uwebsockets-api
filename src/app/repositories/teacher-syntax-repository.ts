import { db } from '#database/db.js';
import {
    teacherSyntaxLessons,
    teacherSyntaxSections,
    teacherSyntaxExamples,
    teacherSyntaxExercises,
    teacherSyntaxExerciseOptions,
    teacherSyntaxAttempts,
    teacherSyntaxExerciseAttempts,
    teacherPhraseAudio,
    teacherSyntaxUserLessons,
} from '#database/schema.js';
import type { teacherPhraseAudioScopeEnum } from '#database/schema.js';
import {
    and,
    asc,
    desc,
    eq,
    getTableColumns,
    inArray,
    sql,
} from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type TeacherSyntaxLessonRow = InferSelectModel<typeof teacherSyntaxLessons>;
export type TeacherSyntaxSectionRow = InferSelectModel<typeof teacherSyntaxSections>;
export type TeacherSyntaxExampleRow = InferSelectModel<typeof teacherSyntaxExamples>;
export type TeacherSyntaxExerciseRow = InferSelectModel<typeof teacherSyntaxExercises>;
export type TeacherSyntaxExerciseOptionRow = InferSelectModel<typeof teacherSyntaxExerciseOptions>;
export type TeacherSyntaxAttemptRow = InferSelectModel<typeof teacherSyntaxAttempts>;
export type TeacherSyntaxExerciseAttemptRow = InferSelectModel<typeof teacherSyntaxExerciseAttempts>;
export type TeacherPhraseAudioRow = InferSelectModel<typeof teacherPhraseAudio>;
export type TeacherSyntaxUserLessonRow = InferSelectModel<typeof teacherSyntaxUserLessons>;
export type TeacherSyntaxLessonListRow = Omit<TeacherSyntaxLessonRow, 'embedding'>;

export type TeacherSyntaxLessonInsert = InferInsertModel<typeof teacherSyntaxLessons>;
export type TeacherSyntaxSectionInsert = InferInsertModel<typeof teacherSyntaxSections>;
export type TeacherSyntaxExampleInsert = InferInsertModel<typeof teacherSyntaxExamples>;
export type TeacherSyntaxExerciseInsert = InferInsertModel<typeof teacherSyntaxExercises>;
export type TeacherSyntaxExerciseOptionInsert = InferInsertModel<typeof teacherSyntaxExerciseOptions>;
export type TeacherPhraseAudioScope = typeof teacherPhraseAudioScopeEnum.enumValues[number];

export interface TeacherSyntaxLessonWithProgressRow {
    lesson: TeacherSyntaxLessonListRow;
    userLesson: TeacherSyntaxUserLessonRow;
}

export interface TeacherSyntaxReusableLessonRow {
    id: bigint;
    distance: number;
    topicTitle: string;
}

export class ReusableSyntaxLessonUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ReusableSyntaxLessonUnavailableError';
    }
}

const {
    embedding: _lessonEmbedding,
    ...lessonColumns
} = getTableColumns(teacherSyntaxLessons);
const userLessonColumns = getTableColumns(teacherSyntaxUserLessons);
type DbClient = typeof db;
type DbTx = Parameters<Parameters<DbClient['transaction']>[0]>[0];
type DbExecutor = DbClient | DbTx;

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
}

async function lockLesson(tx: DbExecutor, lessonId: bigint): Promise<void> {
    await tx.execute(
        sql`SELECT id FROM teacher_syntax_lessons WHERE id = ${lessonId} FOR UPDATE`,
    );
}

async function detachLessonFromUserTx(tx: DbExecutor, userId: bigint, lessonId: bigint): Promise<void> {
    await tx.delete(teacherSyntaxAttempts)
        .where(and(
            eq(teacherSyntaxAttempts.userId, userId),
            eq(teacherSyntaxAttempts.lessonId, lessonId),
        ));

    await tx.delete(teacherSyntaxUserLessons)
        .where(and(
            eq(teacherSyntaxUserLessons.userId, userId),
            eq(teacherSyntaxUserLessons.lessonId, lessonId),
        ));
}

async function findAllAudioKeysByLessonTx(tx: DbExecutor, lessonId: bigint): Promise<string[]> {
    const result = await tx.execute(sql`
        SELECT a.voice_src
        FROM teacher_phrase_audio a
        WHERE
          (a.scope = 'syntax_example' AND a.scope_id IN (
              SELECT id FROM teacher_syntax_examples WHERE lesson_id = ${lessonId}
          ))
          OR
          (a.scope = 'syntax_exercise' AND a.scope_id IN (
              SELECT id FROM teacher_syntax_exercises WHERE lesson_id = ${lessonId}
          ))
    `);

    return (result.rows as { voice_src: string }[]).map((row) => row.voice_src);
}

async function hardDeleteLessonCascadeTx(tx: DbExecutor, lessonId: bigint): Promise<void> {
    await tx.delete(teacherSyntaxLessons)
        .where(eq(teacherSyntaxLessons.id, lessonId));
}

export const teacherSyntaxRepository = {
    // ── Lessons ──────────────────────────────────────────────────────────
    async createLesson(data: TeacherSyntaxLessonInsert): Promise<TeacherSyntaxLessonRow> {
        const [created] = await db.insert(teacherSyntaxLessons).values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create syntax lesson');
        }
        return created;
    },

    async createLessonAndAttachAuthor(
        data: TeacherSyntaxLessonInsert,
        authorUserId: bigint,
    ): Promise<TeacherSyntaxLessonRow> {
        return db.transaction(async (tx) => {
            const [created] = await tx.insert(teacherSyntaxLessons).values({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();
            if (created === undefined) {
                throw new Error('Failed to create syntax lesson');
            }

            await tx.insert(teacherSyntaxUserLessons).values({
                userId: authorUserId,
                lessonId: created.id,
                totalExercises: 0,
                addedAt: new Date(),
                updatedAt: new Date(),
            });

            return created;
        });
    },

    async findLessonsByUser(userId: bigint, langLearning: string): Promise<TeacherSyntaxLessonWithProgressRow[]> {
        return db.select({
            lesson: lessonColumns,
            userLesson: userLessonColumns,
        })
            .from(teacherSyntaxUserLessons)
            .innerJoin(teacherSyntaxLessons, eq(teacherSyntaxUserLessons.lessonId, teacherSyntaxLessons.id))
            .where(and(
                eq(teacherSyntaxUserLessons.userId, userId),
                eq(teacherSyntaxLessons.langLearning, langLearning),
            ))
            .orderBy(desc(teacherSyntaxUserLessons.addedAt));
    },

    async findLessonById(lessonId: bigint): Promise<TeacherSyntaxLessonRow | undefined> {
        return db.select().from(teacherSyntaxLessons)
            .where(eq(teacherSyntaxLessons.id, lessonId))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findReusableLessonForUser(params: {
        userId: bigint;
        langLearning: string;
        langNative: string;
        levelCode: string;
        queryVector: number[];
        maxDistance: number;
    }): Promise<TeacherSyntaxReusableLessonRow | undefined> {
        const vecStr = `[${params.queryVector.join(',')}]`;
        const result = await db.execute(sql`
            SELECT l.id, l.topic_title, (l.embedding <=> ${vecStr}::vector) AS distance
            FROM teacher_syntax_lessons l
            WHERE l.lang_learning = ${params.langLearning}
              AND l.lang_native = ${params.langNative}
              AND l.level_code = ${params.levelCode}
              AND l.status = 'ready'
              AND l.embedding IS NOT NULL
              AND (l.embedding <=> ${vecStr}::vector) <= ${params.maxDistance}
              AND NOT EXISTS (
                  SELECT 1
                  FROM teacher_syntax_user_lessons ul
                  WHERE ul.user_id = ${params.userId} AND ul.lesson_id = l.id
              )
            ORDER BY distance ASC
            LIMIT 1
        `);

        const row = (result.rows as {
            id: bigint | string;
            topic_title: string;
            distance: number | string;
        }[]).at(0);

        if (row === undefined) {
            return undefined;
        }

        return {
            id: typeof row.id === 'string' ? BigInt(row.id) : row.id,
            topicTitle: row.topic_title,
            distance: typeof row.distance === 'string' ? parseFloat(row.distance) : row.distance,
        };
    },

    async updateLessonStatus(lessonId: bigint, status: string, errorMessage?: string): Promise<void> {
        await db.update(teacherSyntaxLessons)
            .set({ status, errorMessage: errorMessage ?? null, updatedAt: new Date() })
            .where(eq(teacherSyntaxLessons.id, lessonId));
    },

    async updateLessonContent(
        lessonId: bigint,
        data: { topicTitle: string; topicSlug: string; ruleSummary: string; levelCode?: string },
    ): Promise<void> {
        await db.update(teacherSyntaxLessons)
            .set({
                topicTitle: data.topicTitle,
                topicSlug: data.topicSlug,
                ruleSummary: data.ruleSummary,
                levelCode: data.levelCode ?? null,
                updatedAt: new Date(),
            })
            .where(eq(teacherSyntaxLessons.id, lessonId));
    },

    async setLessonEmbedding(lessonId: bigint, vector: number[]): Promise<void> {
        const vecStr = `[${vector.join(',')}]`;
        await db.execute(
            sql`UPDATE teacher_syntax_lessons SET embedding = ${vecStr}::vector WHERE id = ${lessonId}`,
        );
    },

    async deleteLesson(lessonId: bigint): Promise<void> {
        await this.hardDeleteLessonCascade(lessonId);
    },

    async hardDeleteLessonCascade(lessonId: bigint): Promise<void> {
        await hardDeleteLessonCascadeTx(db, lessonId);
    },

    async findAllLessonIdsByUser(userId: bigint): Promise<bigint[]> {
        const rows = await db.select({ lessonId: teacherSyntaxUserLessons.lessonId })
            .from(teacherSyntaxUserLessons)
            .where(eq(teacherSyntaxUserLessons.userId, userId));
        return rows.map((row) => row.lessonId);
    },

    async findExamplesByLessonIds(lessonIds: bigint[]): Promise<TeacherSyntaxExampleRow[]> {
        if (lessonIds.length === 0) return [];
        return db.select().from(teacherSyntaxExamples)
            .where(inArray(teacherSyntaxExamples.lessonId, lessonIds));
    },

    // ── Sections ─────────────────────────────────────────────────────────
    async insertSections(sections: TeacherSyntaxSectionInsert[]): Promise<TeacherSyntaxSectionRow[]> {
        if (sections.length === 0) return [];
        return db.insert(teacherSyntaxSections).values(
            sections.map((section) => ({ ...section, createdAt: new Date() })),
        ).returning();
    },

    async findSectionsByLessonId(lessonId: bigint): Promise<TeacherSyntaxSectionRow[]> {
        return db.select().from(teacherSyntaxSections)
            .where(eq(teacherSyntaxSections.lessonId, lessonId))
            .orderBy(asc(teacherSyntaxSections.sortOrder));
    },

    // ── Examples ─────────────────────────────────────────────────────────
    async insertExamples(examples: TeacherSyntaxExampleInsert[]): Promise<TeacherSyntaxExampleRow[]> {
        if (examples.length === 0) return [];
        return db.insert(teacherSyntaxExamples).values(
            examples.map((example) => ({ ...example, createdAt: new Date() })),
        ).returning();
    },

    async findExamplesByLessonId(lessonId: bigint): Promise<TeacherSyntaxExampleRow[]> {
        return db.select().from(teacherSyntaxExamples)
            .where(eq(teacherSyntaxExamples.lessonId, lessonId))
            .orderBy(asc(teacherSyntaxExamples.sortOrder));
    },

    async findExampleById(exampleId: bigint): Promise<TeacherSyntaxExampleRow | undefined> {
        return db.select().from(teacherSyntaxExamples)
            .where(eq(teacherSyntaxExamples.id, exampleId))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findExampleAudio(
        exampleId: bigint,
        voice: string,
        language: string,
        contentHash: string,
    ): Promise<TeacherPhraseAudioRow | undefined> {
        return db.select().from(teacherPhraseAudio)
            .where(and(
                eq(teacherPhraseAudio.scope, 'syntax_example'),
                eq(teacherPhraseAudio.scopeId, exampleId),
                eq(teacherPhraseAudio.voice, voice),
                eq(teacherPhraseAudio.language, language),
                eq(teacherPhraseAudio.contentHash, contentHash),
            ))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findExampleAudioByExampleIds(
        exampleIds: bigint[],
        voice: string,
        language: string,
        contentHashes: string[],
    ): Promise<TeacherPhraseAudioRow[]> {
        if (exampleIds.length === 0 || contentHashes.length === 0) return [];
        return db.select().from(teacherPhraseAudio)
            .where(and(
                eq(teacherPhraseAudio.scope, 'syntax_example'),
                inArray(teacherPhraseAudio.scopeId, exampleIds),
                eq(teacherPhraseAudio.voice, voice),
                eq(teacherPhraseAudio.language, language),
                inArray(teacherPhraseAudio.contentHash, contentHashes),
            ));
    },

    async setExampleAudio(
        exampleId: bigint,
        voice: string,
        language: string,
        contentHash: string,
        voiceSrc: string,
    ): Promise<void> {
        const createdAt = new Date();
        await db.execute(sql`
            INSERT INTO teacher_phrase_audio (scope, scope_id, voice, language, content_hash, voice_src, created_at)
            VALUES ('syntax_example', ${exampleId}, ${voice}, ${language}, ${contentHash}, ${voiceSrc}, ${createdAt})
            ON CONFLICT (scope, scope_id, voice, language, content_hash)
            DO NOTHING
        `);
    },

    async findExerciseById(exerciseId: bigint): Promise<TeacherSyntaxExerciseRow | undefined> {
        return db.select().from(teacherSyntaxExercises)
            .where(eq(teacherSyntaxExercises.id, exerciseId))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findExerciseAudio(
        exerciseId: bigint,
        voice: string,
        language: string,
        contentHash: string,
    ): Promise<TeacherPhraseAudioRow | undefined> {
        return db.select().from(teacherPhraseAudio)
            .where(and(
                eq(teacherPhraseAudio.scope, 'syntax_exercise'),
                eq(teacherPhraseAudio.scopeId, exerciseId),
                eq(teacherPhraseAudio.voice, voice),
                eq(teacherPhraseAudio.language, language),
                eq(teacherPhraseAudio.contentHash, contentHash),
            ))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findExerciseAudioByExerciseIds(
        exerciseIds: bigint[],
        voice: string,
        language: string,
        contentHashes: string[],
    ): Promise<TeacherPhraseAudioRow[]> {
        if (exerciseIds.length === 0 || contentHashes.length === 0) return [];
        return db.select().from(teacherPhraseAudio)
            .where(and(
                eq(teacherPhraseAudio.scope, 'syntax_exercise'),
                inArray(teacherPhraseAudio.scopeId, exerciseIds),
                eq(teacherPhraseAudio.voice, voice),
                eq(teacherPhraseAudio.language, language),
                inArray(teacherPhraseAudio.contentHash, contentHashes),
            ));
    },

    async setExerciseAudio(
        exerciseId: bigint,
        voice: string,
        language: string,
        contentHash: string,
        voiceSrc: string,
    ): Promise<void> {
        const createdAt = new Date();
        await db.execute(sql`
            INSERT INTO teacher_phrase_audio (scope, scope_id, voice, language, content_hash, voice_src, created_at)
            VALUES ('syntax_exercise', ${exerciseId}, ${voice}, ${language}, ${contentHash}, ${voiceSrc}, ${createdAt})
            ON CONFLICT (scope, scope_id, voice, language, content_hash)
            DO NOTHING
        `);
    },

    async findAllAudioKeysByLesson(lessonId: bigint): Promise<string[]> {
        return findAllAudioKeysByLessonTx(db, lessonId);
    },

    async findLegacyExampleAudio(exampleId: bigint, voice: string): Promise<{ voiceSrc: string } | undefined> {
        const result = await db.execute(sql`
            SELECT a.voice_src
            FROM teacher_phrase_audio_legacy a
            WHERE a.scope = 'syntax_example'
              AND a.scope_id = ${exampleId}
              AND a.voice = ${voice}
            ORDER BY a.created_at DESC
            LIMIT 1
        `);

        const row = (result.rows as { voice_src: string }[]).at(0);
        return row !== undefined ? { voiceSrc: row.voice_src } : undefined;
    },

    async findLegacyExerciseAudio(exerciseId: bigint, voice: string): Promise<{ voiceSrc: string } | undefined> {
        const result = await db.execute(sql`
            SELECT a.voice_src
            FROM teacher_phrase_audio_legacy a
            WHERE a.scope = 'syntax_exercise'
              AND a.scope_id = ${exerciseId}
              AND a.voice = ${voice}
            ORDER BY a.created_at DESC
            LIMIT 1
        `);

        const row = (result.rows as { voice_src: string }[]).at(0);
        return row !== undefined ? { voiceSrc: row.voice_src } : undefined;
    },

    // ── Exercises ────────────────────────────────────────────────────────
    async insertExercises(exercises: TeacherSyntaxExerciseInsert[]): Promise<TeacherSyntaxExerciseRow[]> {
        if (exercises.length === 0) return [];
        return db.insert(teacherSyntaxExercises).values(
            exercises.map((exercise) => ({ ...exercise, createdAt: new Date() })),
        ).returning();
    },

    async findExercisesByLessonId(lessonId: bigint): Promise<TeacherSyntaxExerciseRow[]> {
        return db.select().from(teacherSyntaxExercises)
            .where(eq(teacherSyntaxExercises.lessonId, lessonId))
            .orderBy(asc(teacherSyntaxExercises.sortOrder));
    },

    // ── Exercise Options ─────────────────────────────────────────────────
    async insertExerciseOptions(options: TeacherSyntaxExerciseOptionInsert[]): Promise<TeacherSyntaxExerciseOptionRow[]> {
        if (options.length === 0) return [];
        return db.insert(teacherSyntaxExerciseOptions).values(options).returning();
    },

    async findOptionsByExerciseIds(exerciseIds: bigint[]): Promise<TeacherSyntaxExerciseOptionRow[]> {
        if (exerciseIds.length === 0) return [];
        return db.select().from(teacherSyntaxExerciseOptions)
            .where(inArray(teacherSyntaxExerciseOptions.exerciseId, exerciseIds))
            .orderBy(asc(teacherSyntaxExerciseOptions.exerciseId), asc(teacherSyntaxExerciseOptions.sortOrder));
    },

    // ── User Lessons / Progress ──────────────────────────────────────────
    async attachReadyLessonToUser(userId: bigint, lessonId: bigint): Promise<number> {
        return db.transaction(async (tx) => {
            await lockLesson(tx, lessonId);

            const lesson = await tx.select({
                id: teacherSyntaxLessons.id,
                status: teacherSyntaxLessons.status,
            })
                .from(teacherSyntaxLessons)
                .where(eq(teacherSyntaxLessons.id, lessonId))
                .limit(1)
                .then((rows) => rows.at(0));

            if (lesson === undefined) {
                throw new ReusableSyntaxLessonUnavailableError('Reusable syntax lesson not found');
            }
            if (lesson.status !== 'ready') {
                throw new ReusableSyntaxLessonUnavailableError('Reusable syntax lesson is not ready');
            }

            const exerciseCountRows = await tx
                .select({ count: sql<number>`count(*)` })
                .from(teacherSyntaxExercises)
                .where(eq(teacherSyntaxExercises.lessonId, lessonId));

            const totalExercises = exerciseCountRows.at(0)?.count ?? 0;
            const addedAt = new Date();
            await tx.execute(sql`
                INSERT INTO teacher_syntax_user_lessons (
                    user_id, lesson_id, total_exercises, added_at, updated_at
                )
                VALUES (${userId}, ${lessonId}, ${totalExercises}, ${addedAt}, ${addedAt})
                ON CONFLICT (user_id, lesson_id) DO NOTHING
            `);

            return totalExercises;
        });
    },

    async detachLessonFromUser(userId: bigint, lessonId: bigint): Promise<void> {
        await db.transaction(async (tx) => {
            await detachLessonFromUserTx(tx, userId, lessonId);
        });
    },

    async detachAndMaybeHardDelete(
        userId: bigint,
        lessonId: bigint,
    ): Promise<{ deleted: boolean; voiceSrcKeys: string[] }> {
        return db.transaction(async (tx) => {
            await lockLesson(tx, lessonId);

            await detachLessonFromUserTx(tx, userId, lessonId);

            const countRows = await tx
                .select({ count: sql<number>`count(*)` })
                .from(teacherSyntaxUserLessons)
                .where(eq(teacherSyntaxUserLessons.lessonId, lessonId));

            const subscriberCount = countRows.at(0)?.count ?? 0;
            if (subscriberCount === 0) {
                const voiceSrcKeys = uniqueStrings(await findAllAudioKeysByLessonTx(tx, lessonId));
                await hardDeleteLessonCascadeTx(tx, lessonId);
                return { deleted: true, voiceSrcKeys };
            }

            return { deleted: false, voiceSrcKeys: [] };
        });
    },

    async countLessonSubscribers(lessonId: bigint): Promise<number> {
        const rows = await db
            .select({ count: sql<number>`count(*)` })
            .from(teacherSyntaxUserLessons)
            .where(eq(teacherSyntaxUserLessons.lessonId, lessonId));

        return rows.at(0)?.count ?? 0;
    },

    async hasUserLesson(userId: bigint, lessonId: bigint): Promise<boolean> {
        const row = await this.findUserLesson(userId, lessonId);
        return row !== undefined;
    },

    async findUserLesson(userId: bigint, lessonId: bigint): Promise<TeacherSyntaxUserLessonRow | undefined> {
        return db.select().from(teacherSyntaxUserLessons)
            .where(and(
                eq(teacherSyntaxUserLessons.userId, userId),
                eq(teacherSyntaxUserLessons.lessonId, lessonId),
            ))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findUserLessonsByLessonIds(userId: bigint, lessonIds: bigint[]): Promise<TeacherSyntaxUserLessonRow[]> {
        if (lessonIds.length === 0) return [];
        return db.select().from(teacherSyntaxUserLessons)
            .where(and(
                eq(teacherSyntaxUserLessons.userId, userId),
                inArray(teacherSyntaxUserLessons.lessonId, lessonIds),
            ));
    },

    async updateUserLessonProgress(
        userId: bigint,
        lessonId: bigint,
        patch: Partial<{
            totalExercises: number;
            completedExercises: number;
            pronouncedExercises: number;
            correctCount: number;
            mistakesCount: number;
            masteryStatus: string;
            lastPracticedAt: Date;
        }>,
    ): Promise<void> {
        const updateData: Partial<TeacherSyntaxUserLessonRow> = {};

        if (Object.prototype.hasOwnProperty.call(patch, 'totalExercises')) {
            updateData.totalExercises = patch.totalExercises ?? 0;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'completedExercises')) {
            updateData.completedExercises = patch.completedExercises ?? 0;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'pronouncedExercises')) {
            updateData.pronouncedExercises = patch.pronouncedExercises ?? 0;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'correctCount')) {
            updateData.correctCount = patch.correctCount ?? 0;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'mistakesCount')) {
            updateData.mistakesCount = patch.mistakesCount ?? 0;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'masteryStatus')) {
            updateData.masteryStatus = patch.masteryStatus ?? 'new';
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'lastPracticedAt')) {
            updateData.lastPracticedAt = patch.lastPracticedAt ?? null;
        }

        if (Object.keys(updateData).length === 0) {
            return;
        }

        updateData.updatedAt = new Date();

        await db.update(teacherSyntaxUserLessons)
            .set(updateData)
            .where(and(
                eq(teacherSyntaxUserLessons.userId, userId),
                eq(teacherSyntaxUserLessons.lessonId, lessonId),
            ));
    },

    // ── Attempts ─────────────────────────────────────────────────────────
    async createAttempt(lessonId: bigint, userId: bigint, totalExercises: number): Promise<TeacherSyntaxAttemptRow> {
        const [created] = await db.insert(teacherSyntaxAttempts).values({
            lessonId,
            userId,
            totalExercises,
            startedAt: new Date(),
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create syntax attempt');
        }
        return created;
    },

    async findAttemptById(attemptId: bigint): Promise<TeacherSyntaxAttemptRow | undefined> {
        return db.select().from(teacherSyntaxAttempts)
            .where(eq(teacherSyntaxAttempts.id, attemptId))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findLatestActiveAttempt(
        lessonId: bigint,
        userId: bigint,
    ): Promise<TeacherSyntaxAttemptRow | undefined> {
        return db.select().from(teacherSyntaxAttempts)
            .where(and(
                eq(teacherSyntaxAttempts.lessonId, lessonId),
                eq(teacherSyntaxAttempts.userId, userId),
                sql`${teacherSyntaxAttempts.completedAt} IS NULL`,
            ))
            .orderBy(desc(teacherSyntaxAttempts.startedAt))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async updateAttemptStats(
        attemptId: bigint,
        data: { correctCount: number; mistakesCount: number; resultStatus: string; completedAt?: Date },
    ): Promise<void> {
        await db.update(teacherSyntaxAttempts).set({
            correctCount: data.correctCount,
            mistakesCount: data.mistakesCount,
            resultStatus: data.resultStatus,
            completedAt: data.completedAt ?? null,
        }).where(eq(teacherSyntaxAttempts.id, attemptId));
    },

    // ── Exercise Attempts ────────────────────────────────────────────────
    async createExerciseAttempt(data: {
        attemptId: bigint;
        lessonId: bigint;
        exerciseId: bigint;
        userAnswer: string;
        isCorrect: boolean;
        feedback?: string;
    }): Promise<TeacherSyntaxExerciseAttemptRow> {
        const now = new Date();
        await db.execute(sql`
            INSERT INTO teacher_syntax_exercise_attempts (
                attempt_id,
                lesson_id,
                exercise_id,
                user_answer,
                is_correct,
                feedback,
                answered_at
            )
            VALUES (
                ${data.attemptId},
                ${data.lessonId},
                ${data.exerciseId},
                ${data.userAnswer},
                ${data.isCorrect},
                ${data.feedback ?? null},
                ${now}
            )
            ON CONFLICT (attempt_id, exercise_id) DO NOTHING
        `);

        const row = await this.findExerciseAttemptByAttemptAndExercise(data.attemptId, data.exerciseId);
        if (row === undefined) {
            throw new Error('Failed to create syntax exercise attempt');
        }
        return row;
    },

    async findExerciseAttemptByAttemptAndExercise(
        attemptId: bigint,
        exerciseId: bigint,
    ): Promise<TeacherSyntaxExerciseAttemptRow | undefined> {
        return db.select().from(teacherSyntaxExerciseAttempts)
            .where(and(
                eq(teacherSyntaxExerciseAttempts.attemptId, attemptId),
                eq(teacherSyntaxExerciseAttempts.exerciseId, exerciseId),
            ))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async markExercisePronunciationPassed(
        attemptRowId: bigint,
        recognizedText: string,
        pronunciationScore: string,
    ): Promise<boolean> {
        // attempts_count tracks all submitted pronunciation tries, including the successful one.
        const result = await db.execute(sql`
            UPDATE teacher_syntax_exercise_attempts
            SET
                recognized_text = ${recognizedText},
                pronunciation_score = ${pronunciationScore}::numeric,
                pronunciation_status = 'passed',
                pronunciation_attempts_count = pronunciation_attempts_count + 1,
                pronunciation_passed_at = NOW(),
                completed_at = NOW()
            WHERE id = ${attemptRowId}
              AND completed_at IS NULL
              AND pronunciation_status = 'pending'
        `);
        return (result.rowCount ?? 0) > 0;
    },

    async recordExercisePronunciationAttempt(
        attemptRowId: bigint,
        recognizedText: string,
        pronunciationScore: string,
    ): Promise<void> {
        await db.execute(sql`
            UPDATE teacher_syntax_exercise_attempts
            SET
                recognized_text = ${recognizedText},
                pronunciation_score = ${pronunciationScore}::numeric,
                pronunciation_attempts_count = pronunciation_attempts_count + 1
            WHERE id = ${attemptRowId}
        `);
    },

    async markExercisePronunciationSkipped(
        attemptRowId: bigint,
        skipReason: 'attempt_limit' | 'technical_unavailable',
        skipReportedBy: 'client' | 'server',
    ): Promise<boolean> {
        const result = await db.execute(sql`
            UPDATE teacher_syntax_exercise_attempts
            SET
                pronunciation_status = 'skipped',
                skip_reason = ${skipReason},
                skip_reported_by = ${skipReportedBy},
                completed_at = NOW()
            WHERE id = ${attemptRowId}
              AND completed_at IS NULL
              AND pronunciation_status = 'pending'
        `);
        return (result.rowCount ?? 0) > 0;
    },

    async findExerciseAttemptsByAttemptId(attemptId: bigint): Promise<TeacherSyntaxExerciseAttemptRow[]> {
        return db.select().from(teacherSyntaxExerciseAttempts)
            .where(eq(teacherSyntaxExerciseAttempts.attemptId, attemptId))
            .orderBy(asc(teacherSyntaxExerciseAttempts.answeredAt));
    },

    async countDistinctExercisesAnsweredByAttempt(attemptId: bigint): Promise<number> {
        const result = await db
            .select({ count: sql<number>`count(distinct ${teacherSyntaxExerciseAttempts.exerciseId})` })
            .from(teacherSyntaxExerciseAttempts)
            .where(eq(teacherSyntaxExerciseAttempts.attemptId, attemptId));
        return result.at(0)?.count ?? 0;
    },
};
