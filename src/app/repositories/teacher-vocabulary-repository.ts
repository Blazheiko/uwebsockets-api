import { db } from '#database/db.js';
import {
    teacherVocabularyCollections,
    teacherVocabularyBatches,
    teacherVocabularyWords,
    teacherVocabularyExamples,
    teacherVocabularyProgress,
    teacherVocabularyUserCollections,
    teacherPhraseAudio,
} from '#database/schema.js';
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';
import type {
    KnownVocabularyContextRow,
    KnownVocabularyStatus,
} from '#app/services/teacher-known-vocabulary-context.js';

export type TeacherVocabularyCollectionRow = InferSelectModel<typeof teacherVocabularyCollections>;
export type TeacherVocabularyBatchRow = InferSelectModel<typeof teacherVocabularyBatches>;
export type TeacherVocabularyWordRow = InferSelectModel<typeof teacherVocabularyWords>;
export type TeacherVocabularyExampleRow = InferSelectModel<typeof teacherVocabularyExamples>;
export type TeacherVocabularyProgressRow = InferSelectModel<typeof teacherVocabularyProgress>;
export type TeacherVocabularyUserCollectionRow = InferSelectModel<typeof teacherVocabularyUserCollections>;
export type TeacherVocabularyWordAudioRow = InferSelectModel<typeof teacherPhraseAudio>;
export type TeacherVocabularyExampleAudioRow = InferSelectModel<typeof teacherPhraseAudio>;

export type TeacherVocabularyWordInsert = InferInsertModel<typeof teacherVocabularyWords>;
export type TeacherVocabularyExampleInsert = InferInsertModel<typeof teacherVocabularyExamples>;

type DbClient = typeof db;
type DbTx = Parameters<Parameters<DbClient['transaction']>[0]>[0];
type DbExecutor = DbClient | DbTx;

function levelCodeCondition(levelCode: string | null | undefined): SQL {
    return levelCode === null || levelCode === undefined
        ? isNull(teacherVocabularyCollections.levelCode)
        : eq(teacherVocabularyCollections.levelCode, levelCode);
}

async function findCollectionByNaturalKey(
    executor: DbExecutor,
    params: {
        langLearning: string;
        langNative: string;
        topicSlug: string;
        purposeSlug: string;
        levelCode?: string | null;
    },
): Promise<TeacherVocabularyCollectionRow | undefined> {
    return executor.select().from(teacherVocabularyCollections)
        .where(and(
            eq(teacherVocabularyCollections.langLearning, params.langLearning),
            eq(teacherVocabularyCollections.langNative, params.langNative),
            eq(teacherVocabularyCollections.topicSlug, params.topicSlug),
            eq(teacherVocabularyCollections.purposeSlug, params.purposeSlug),
            levelCodeCondition(params.levelCode),
        ))
        .limit(1)
        .then((rows) => rows.at(0));
}

function toTeacherVocabularyMasteryStatus(value: string): KnownVocabularyStatus {
    if (value === 'mastered' || value === 'reviewing' || value === 'learning' || value === 'new') {
        return value;
    }
    return 'new';
}

function toNullableDate(value: Date | string | null): Date | null {
    if (value === null) return null;
    return value instanceof Date ? value : new Date(value);
}

export const teacherVocabularyRepository = {
    async setCollectionEmbedding(collectionId: bigint, embedding: number[]): Promise<void> {
        const vecStr = `[${embedding.join(',')}]`;
        await db.execute(
            sql`UPDATE teacher_vocabulary_collections SET embedding = ${vecStr}::vector WHERE id = ${collectionId}`,
        );
    },

    async findReusableCollectionForUser(params: {
        userId: bigint;
        langLearning: string;
        langNative: string;
        levelCode: string | null;
        queryVector: number[];
        maxDistance: number;
    }): Promise<{ id: bigint; topicTitle: string; distance: number } | undefined> {
        const vecStr = `[${params.queryVector.join(',')}]`;
        const levelClause = params.levelCode === null
            ? sql`c.level_code IS NULL`
            : sql`c.level_code = ${params.levelCode}`;

        const result = await db.execute(sql`
            SELECT c.id, c.topic_title, (c.embedding <=> ${vecStr}::vector) AS distance
            FROM teacher_vocabulary_collections c
            WHERE c.lang_learning = ${params.langLearning}
              AND c.lang_native = ${params.langNative}
              AND ${levelClause}
              AND c.status = 'ready'
              AND c.embedding IS NOT NULL
              AND (c.embedding <=> ${vecStr}::vector) <= ${params.maxDistance}
              AND NOT EXISTS (
                  SELECT 1
                  FROM teacher_vocabulary_user_collections uc
                  WHERE uc.user_id = ${params.userId} AND uc.collection_id = c.id
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

    async findSimilarOwnedCollections(params: {
        userId: bigint;
        langLearning: string;
        langNative: string;
        levelCode: string | null;
        queryVector: number[];
        maxDistance: number;
        excludeCollectionId?: bigint;
    }): Promise<{ id: bigint; topicTitle: string; distance: number }[]> {
        const vecStr = `[${params.queryVector.join(',')}]`;
        const levelClause = params.levelCode === null
            ? sql`c.level_code IS NULL`
            : sql`c.level_code = ${params.levelCode}`;

        const result = await db.execute(sql`
            SELECT
                c.id,
                c.topic_title,
                (c.embedding <=> ${vecStr}::vector) AS distance
            FROM teacher_vocabulary_collections c
            JOIN teacher_vocabulary_user_collections uc ON uc.collection_id = c.id
            WHERE uc.user_id = ${params.userId}
              AND c.lang_learning = ${params.langLearning}
              AND c.lang_native = ${params.langNative}
              AND ${levelClause}
              AND c.status = 'ready'
              AND c.embedding IS NOT NULL
              AND (c.embedding <=> ${vecStr}::vector) <= ${params.maxDistance}
              AND (${params.excludeCollectionId ?? null}::bigint IS NULL
                   OR c.id != ${params.excludeCollectionId ?? null}::bigint)
            ORDER BY distance ASC
            LIMIT 10
        `);

        return (result.rows as {
            id: bigint | string;
            topic_title: string;
            distance: number | string;
        }[]).map((row) => ({
            id: typeof row.id === 'string' ? BigInt(row.id) : row.id,
            topicTitle: row.topic_title,
            distance: typeof row.distance === 'string' ? parseFloat(row.distance) : row.distance,
        }));
    },

    async attachCollectionToUser(userId: bigint, collectionId: bigint): Promise<void> {
        await db.insert(teacherVocabularyUserCollections).values({
            userId,
            collectionId,
            addedAt: new Date(),
            updatedAt: new Date(),
        }).onConflictDoNothing();
    },

    async detachCollectionFromUser(userId: bigint, collectionId: bigint): Promise<void> {
        await db.delete(teacherVocabularyUserCollections)
            .where(and(
                eq(teacherVocabularyUserCollections.userId, userId),
                eq(teacherVocabularyUserCollections.collectionId, collectionId),
            ));
    },

    async isUserAttachedToCollection(userId: bigint, collectionId: bigint): Promise<boolean> {
        const row = await db.select({ userId: teacherVocabularyUserCollections.userId })
            .from(teacherVocabularyUserCollections)
            .where(and(
                eq(teacherVocabularyUserCollections.userId, userId),
                eq(teacherVocabularyUserCollections.collectionId, collectionId),
            ))
            .limit(1)
            .then((rows) => rows.at(0));
        return row !== undefined;
    },

    async findOrCreateCollection(params: {
        creatorUserId: bigint;
        langLearning: string;
        langNative: string;
        topicSlug: string;
        topicTitle: string;
        purposeDescription: string;
        purposeSlug: string;
        levelCode?: string | null;
    }): Promise<{ collection: TeacherVocabularyCollectionRow; isNew: boolean }> {
        const inserted = await db.execute(sql`
            INSERT INTO teacher_vocabulary_collections
                (user_id, lang_learning, lang_native, topic_slug, topic_title, purpose_description, purpose_slug, level_code, status, created_at, updated_at)
            VALUES
                (${params.creatorUserId}, ${params.langLearning}, ${params.langNative}, ${params.topicSlug},
                 ${params.topicTitle}, ${params.purposeDescription}, ${params.purposeSlug},
                 ${params.levelCode ?? null}, 'ready', now(), now())
            ON CONFLICT (lang_learning, lang_native, topic_slug, purpose_slug, COALESCE(level_code, ''))
            DO NOTHING
            RETURNING id
        `);

        const collection = await findCollectionByNaturalKey(db, params);
        if (collection === undefined) {
            throw new Error('Failed to find or create vocabulary collection');
        }

        return {
            collection,
            isNew: inserted.rows.length > 0,
        };
    },

    async findCollectionById(collectionId: bigint): Promise<TeacherVocabularyCollectionRow | undefined> {
        return db.select().from(teacherVocabularyCollections)
            .where(eq(teacherVocabularyCollections.id, collectionId))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findCollectionsByUser(userId: bigint, langLearning: string): Promise<TeacherVocabularyCollectionRow[]> {
        return db.select({
            id: teacherVocabularyCollections.id,
            userId: teacherVocabularyCollections.userId,
            langLearning: teacherVocabularyCollections.langLearning,
            langNative: teacherVocabularyCollections.langNative,
            topicSlug: teacherVocabularyCollections.topicSlug,
            topicTitle: teacherVocabularyCollections.topicTitle,
            purposeDescription: teacherVocabularyCollections.purposeDescription,
            purposeSlug: teacherVocabularyCollections.purposeSlug,
            levelCode: teacherVocabularyCollections.levelCode,
            status: teacherVocabularyCollections.status,
            embedding: teacherVocabularyCollections.embedding,
            createdAt: teacherVocabularyCollections.createdAt,
            updatedAt: teacherVocabularyCollections.updatedAt,
        })
            .from(teacherVocabularyUserCollections)
            .innerJoin(
                teacherVocabularyCollections,
                eq(teacherVocabularyUserCollections.collectionId, teacherVocabularyCollections.id),
            )
            .where(and(
                eq(teacherVocabularyUserCollections.userId, userId),
                eq(teacherVocabularyCollections.langLearning, langLearning),
            ))
            .orderBy(desc(teacherVocabularyUserCollections.addedAt));
    },

    async updateCollectionStatus(collectionId: bigint, status: string): Promise<void> {
        await db.update(teacherVocabularyCollections)
            .set({ status, updatedAt: new Date() })
            .where(eq(teacherVocabularyCollections.id, collectionId));
    },

    async createBatch(collectionId: bigint, requestedCount = 20): Promise<TeacherVocabularyBatchRow> {
        const [created] = await db.insert(teacherVocabularyBatches).values({
            collectionId,
            requestedCount,
            createdAt: new Date(),
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create vocabulary batch');
        }
        return created;
    },

    async findActiveBatch(collectionId: bigint): Promise<TeacherVocabularyBatchRow | undefined> {
        return db.select().from(teacherVocabularyBatches)
            .where(and(
                eq(teacherVocabularyBatches.collectionId, collectionId),
                inArray(teacherVocabularyBatches.status, ['queued', 'generating']),
            ))
            .orderBy(desc(teacherVocabularyBatches.createdAt))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async markBatchGenerating(batchId: bigint): Promise<void> {
        await db.update(teacherVocabularyBatches)
            .set({ status: 'generating', startedAt: new Date() })
            .where(eq(teacherVocabularyBatches.id, batchId));
    },

    async updateBatchMeta(batchId: bigint, meta: { llmModel?: string | undefined; promptVersion?: string | undefined }): Promise<void> {
        await db.update(teacherVocabularyBatches)
            .set({ llmModel: meta.llmModel ?? null, promptVersion: meta.promptVersion ?? null })
            .where(eq(teacherVocabularyBatches.id, batchId));
    },

    async updateBatchGeneratedCount(batchId: bigint, generatedCount: number): Promise<void> {
        await db.update(teacherVocabularyBatches)
            .set({ generatedCount })
            .where(eq(teacherVocabularyBatches.id, batchId));
    },

    async markBatchReady(batchId: bigint, generatedCount: number): Promise<void> {
        await db.update(teacherVocabularyBatches)
            .set({ status: 'ready', generatedCount, completedAt: new Date() })
            .where(eq(teacherVocabularyBatches.id, batchId));
    },

    async markBatchPartial(batchId: bigint, generatedCount: number, errorMessage?: string): Promise<void> {
        await db.update(teacherVocabularyBatches)
            .set({ status: 'partial', generatedCount, errorMessage: errorMessage ?? null, completedAt: new Date() })
            .where(eq(teacherVocabularyBatches.id, batchId));
    },

    async markBatchError(batchId: bigint, message: string): Promise<void> {
        await db.update(teacherVocabularyBatches)
            .set({ status: 'error', errorMessage: message, completedAt: new Date() })
            .where(eq(teacherVocabularyBatches.id, batchId));
    },

    async findLatestBatchByCollectionId(collectionId: bigint): Promise<TeacherVocabularyBatchRow | undefined> {
        return db.select().from(teacherVocabularyBatches)
            .where(eq(teacherVocabularyBatches.collectionId, collectionId))
            .orderBy(desc(teacherVocabularyBatches.createdAt))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findWordById(wordId: bigint): Promise<TeacherVocabularyWordRow | undefined> {
        return db.select().from(teacherVocabularyWords)
            .where(eq(teacherVocabularyWords.id, wordId))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findWordsByCollectionId(collectionId: bigint): Promise<TeacherVocabularyWordRow[]> {
        return db.select().from(teacherVocabularyWords)
            .where(eq(teacherVocabularyWords.collectionId, collectionId))
            .orderBy(asc(teacherVocabularyWords.sortOrder), asc(teacherVocabularyWords.createdAt));
    },

    async countWordsByCollectionId(collectionId: bigint): Promise<number> {
        const [row] = await db.select({ value: count() }).from(teacherVocabularyWords)
            .where(eq(teacherVocabularyWords.collectionId, collectionId));
        return row?.value ?? 0;
    },

    async findExamplesByWordIds(wordIds: bigint[]): Promise<TeacherVocabularyExampleRow[]> {
        if (wordIds.length === 0) return [];
        return db.select().from(teacherVocabularyExamples)
            .where(inArray(teacherVocabularyExamples.wordId, wordIds))
            .orderBy(asc(teacherVocabularyExamples.wordId), asc(teacherVocabularyExamples.sortOrder));
    },

    async findExampleById(exampleId: bigint): Promise<TeacherVocabularyExampleRow | undefined> {
        return db.select().from(teacherVocabularyExamples)
            .where(eq(teacherVocabularyExamples.id, exampleId))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async getProgressByWordIds(userId: bigint, wordIds: bigint[]): Promise<TeacherVocabularyProgressRow[]> {
        if (wordIds.length === 0) return [];
        return db.select().from(teacherVocabularyProgress)
            .where(and(
                eq(teacherVocabularyProgress.userId, userId),
                inArray(teacherVocabularyProgress.wordId, wordIds),
            ));
    },

    async findAllNormalizedUserWords(userId: bigint, langLearning: string): Promise<string[]> {
        const rows = await db.select({
            normalizedWord: teacherVocabularyWords.normalizedWord,
        })
            .from(teacherVocabularyWords)
            .innerJoin(
                teacherVocabularyCollections,
                eq(teacherVocabularyWords.collectionId, teacherVocabularyCollections.id),
            )
            .innerJoin(
                teacherVocabularyUserCollections,
                eq(teacherVocabularyWords.collectionId, teacherVocabularyUserCollections.collectionId),
            )
            .where(and(
                eq(teacherVocabularyUserCollections.userId, userId),
                eq(teacherVocabularyCollections.langLearning, langLearning),
            ));
        return rows.map((row) => row.normalizedWord);
    },

    async findUserVocabularyForTeacherContext(params: {
        userId: bigint;
        langLearning: string;
        langNative: string;
        /** Must be normalized with normalizeKnownVocabularyWord before calling. */
        excludeNormalizedWords?: string[];
        limit?: number;
    }): Promise<KnownVocabularyContextRow[]> {
        const queryLimit = params.limit ?? 200;
        const excludeClause =
            params.excludeNormalizedWords !== undefined && params.excludeNormalizedWords.length > 0
                ? sql`AND w.normalized_word NOT IN (${sql.join(params.excludeNormalizedWords.map((word) => sql`${word}`), sql`, `)})`
                : sql``;
        const result = await db.execute(sql`
            WITH ranked_words AS (
                SELECT
                    w.word,
                    w.normalized_word,
                    w.translation,
                    p.mastery_status,
                    p.correct_count,
                    ((p.mistakes_count + 1)::float / (p.attempts_count + 2)) AS smoothed_error_rate,
                    p.last_practiced_at,
                    CASE p.mastery_status
                        WHEN 'mastered'  THEN 4
                        WHEN 'reviewing' THEN 3
                        WHEN 'learning'  THEN 2
                        WHEN 'new'       THEN 1
                        ELSE 0
                    END AS status_rank,
                    ROW_NUMBER() OVER (
                        PARTITION BY w.normalized_word
                        ORDER BY
                            CASE p.mastery_status
                                WHEN 'mastered'  THEN 4
                                WHEN 'reviewing' THEN 3
                                WHEN 'learning'  THEN 2
                                WHEN 'new'       THEN 1
                                ELSE 0
                            END DESC,
                            p.correct_count DESC,
                            p.last_practiced_at DESC NULLS LAST,
                            w.created_at DESC
                    ) AS row_rank
                FROM teacher_vocabulary_progress p
                JOIN teacher_vocabulary_words w
                    ON w.id = p.word_id
                JOIN teacher_vocabulary_collections c
                    ON c.id = w.collection_id
                JOIN teacher_vocabulary_user_collections uc
                    ON uc.collection_id = c.id AND uc.user_id = p.user_id
                WHERE p.user_id = ${params.userId}
                  AND c.lang_learning = ${params.langLearning}
                  AND c.lang_native = ${params.langNative}
                  ${excludeClause}
            )
            SELECT
                word,
                normalized_word,
                translation,
                mastery_status,
                correct_count,
                smoothed_error_rate,
                last_practiced_at
            FROM ranked_words
            WHERE row_rank = 1
              AND mastery_status IN ('mastered', 'reviewing', 'learning')
            ORDER BY
                CASE mastery_status
                    WHEN 'mastered'  THEN 4
                    WHEN 'reviewing' THEN 3
                    WHEN 'learning'  THEN 2
                    ELSE 0
                END DESC,
                last_practiced_at ASC NULLS FIRST,
                smoothed_error_rate DESC
            LIMIT ${queryLimit}
        `);

        return (result.rows as {
            word: string;
            normalized_word: string;
            translation: string;
            mastery_status: string;
            correct_count: number | string;
            smoothed_error_rate: number | string;
            last_practiced_at: Date | string | null;
        }[]).map((row) => ({
            word: row.word,
            normalizedWord: row.normalized_word,
            translation: row.translation,
            masteryStatus: toTeacherVocabularyMasteryStatus(row.mastery_status),
            correctCount: Number(row.correct_count),
            smoothedErrorRate: Number(row.smoothed_error_rate),
            lastPracticedAt: toNullableDate(row.last_practiced_at),
        }));
    },

    async getVocabularyStats(params: {
        userId: bigint;
        langLearning: string;
    }): Promise<{
        total: number;
        mastered: number;
        reviewing: number;
        learning: number;
        newWords: number;
    }> {
        const result = await db.execute(sql`
            WITH best_status AS (
                SELECT
                    w.normalized_word,
                    MAX(CASE p.mastery_status
                        WHEN 'mastered'  THEN 4
                        WHEN 'reviewing' THEN 3
                        WHEN 'learning'  THEN 2
                        WHEN 'new'       THEN 1
                        ELSE 0
                    END) AS best_level
                FROM teacher_vocabulary_progress p
                JOIN teacher_vocabulary_words w
                    ON w.id = p.word_id
                JOIN teacher_vocabulary_collections c
                    ON c.id = w.collection_id
                JOIN teacher_vocabulary_user_collections uc
                    ON uc.collection_id = c.id AND uc.user_id = p.user_id
                WHERE p.user_id = ${params.userId}
                  AND c.lang_learning = ${params.langLearning}
                GROUP BY w.normalized_word
            )
            SELECT
                COUNT(*)                                        AS total,
                COUNT(*) FILTER (WHERE best_level = 4)         AS mastered,
                COUNT(*) FILTER (WHERE best_level = 3)         AS reviewing,
                COUNT(*) FILTER (WHERE best_level = 2)         AS learning,
                COUNT(*) FILTER (WHERE best_level = 1)         AS new_words
            FROM best_status
        `);

        const row = (result.rows as {
            total: string | number;
            mastered: string | number;
            reviewing: string | number;
            learning: string | number;
            new_words: string | number;
        }[])[0];

        if (row === undefined) {
            return { total: 0, mastered: 0, reviewing: 0, learning: 0, newWords: 0 };
        }

        return {
            total:    parseInt(String(row.total),    10),
            mastered: parseInt(String(row.mastered),  10),
            reviewing: parseInt(String(row.reviewing), 10),
            learning: parseInt(String(row.learning),  10),
            newWords: parseInt(String(row.new_words), 10),
        };
    },

    async getPriorityWordsByCollectionIds(params: {
        userId: bigint;
        collectionIds: bigint[];
        limit?: number;
    }): Promise<string[]> {
        if (params.collectionIds.length === 0) return [];

        const idsStr = `{${params.collectionIds.join(',')}}`;
        const rows = await db.execute(sql`
            SELECT
                w.normalized_word,
                SUM(p.correct_count) AS total_correct
            FROM teacher_vocabulary_words w
            JOIN teacher_vocabulary_progress p
                ON p.word_id = w.id AND p.user_id = ${params.userId}
            WHERE w.collection_id = ANY(${idsStr}::bigint[])
              AND p.mastery_status IN ('reviewing', 'mastered')
            GROUP BY w.normalized_word
            ORDER BY total_correct DESC
            LIMIT ${params.limit ?? 200}
        `);

        return (rows.rows as { normalized_word: string }[]).map((row) => row.normalized_word);
    },

    async upsertWords(
        collectionId: bigint,
        batchId: bigint,
        words: Omit<TeacherVocabularyWordInsert, 'collectionId' | 'batchId' | 'createdAt'>[],
    ): Promise<{ row: TeacherVocabularyWordRow; isNew: boolean }[]> {
        if (words.length === 0) return [];

        const normalizedKeys = words.map((w) => w.normalizedWord);
        const existingRows = await db.select().from(teacherVocabularyWords)
            .where(and(
                eq(teacherVocabularyWords.collectionId, collectionId),
                inArray(teacherVocabularyWords.normalizedWord, normalizedKeys),
            ));
        const existingMap = new Map(existingRows.map((r) => [r.normalizedWord, r]));

        const toInsert = words.filter((w) => !existingMap.has(w.normalizedWord));
        const results: { row: TeacherVocabularyWordRow; isNew: boolean }[] = [];

        for (const row of existingRows) {
            results.push({ row, isNew: false });
        }

        if (toInsert.length > 0) {
            const inserted = await db.insert(teacherVocabularyWords).values(
                toInsert.map((word) => ({
                    collectionId,
                    batchId,
                    word: word.word,
                    normalizedWord: word.normalizedWord,
                    translation: word.translation,
                    transcription: word.transcription ?? null,
                    partOfSpeech: word.partOfSpeech ?? null,
                    sortOrder: word.sortOrder ?? 0,
                    createdAt: new Date(),
                })),
            ).onConflictDoNothing().returning();
            for (const row of inserted) {
                results.push({ row, isNew: true });
            }
        }

        return results;
    },

    async replaceExamples(wordId: bigint, examples: Omit<TeacherVocabularyExampleInsert, 'wordId' | 'createdAt'>[]): Promise<void> {
        await db.delete(teacherVocabularyExamples).where(eq(teacherVocabularyExamples.wordId, wordId));
        if (examples.length === 0) return;
        await db.insert(teacherVocabularyExamples).values(examples.map((example) => ({
            wordId,
            sortOrder: example.sortOrder ?? 0,
            sentence: example.sentence,
            translation: example.translation,
            createdAt: new Date(),
        })));
    },

    async ensureProgress(userId: bigint, wordId: bigint): Promise<void> {
        const existing = await db.select().from(teacherVocabularyProgress)
            .where(and(
                eq(teacherVocabularyProgress.userId, userId),
                eq(teacherVocabularyProgress.wordId, wordId),
            ))
            .limit(1)
            .then((rows) => rows.at(0));
        if (existing !== undefined) return;
        await db.insert(teacherVocabularyProgress).values({
            userId,
            wordId,
            updatedAt: new Date(),
        });
    },

    async incrementPracticeStats(
        userId: bigint,
        wordId: bigint,
        payload: {
            isCorrect: boolean;
            pronunciationScore?: number;
            recognitionScore?: number;
        },
    ): Promise<TeacherVocabularyProgressRow | undefined> {
        await teacherVocabularyRepository.ensureProgress(userId, wordId);
        const existing = await db.select().from(teacherVocabularyProgress)
            .where(and(
                eq(teacherVocabularyProgress.userId, userId),
                eq(teacherVocabularyProgress.wordId, wordId),
            ))
            .limit(1)
            .then((rows) => rows.at(0));
        if (existing === undefined) return undefined;
        const attemptsCount = existing.attemptsCount + 1;
        const correctCount = existing.correctCount + (payload.isCorrect ? 1 : 0);
        const mistakesCount = existing.mistakesCount + (payload.isCorrect ? 0 : 1);
        const masteryStatus =
            correctCount >= 10 ? 'mastered' :
                correctCount >= 5 ? 'reviewing' :
                    correctCount >= 1 ? 'learning' : 'new';
        const [updated] = await db.update(teacherVocabularyProgress).set({
            attemptsCount,
            correctCount,
            mistakesCount,
            pronunciationScore: payload.pronunciationScore !== undefined ? String(payload.pronunciationScore) : existing.pronunciationScore,
            recognitionScore: payload.recognitionScore !== undefined ? String(payload.recognitionScore) : existing.recognitionScore,
            masteryStatus,
            lastPracticedAt: new Date(),
            lastCorrectAt: payload.isCorrect ? new Date() : existing.lastCorrectAt,
            updatedAt: new Date(),
        }).where(and(
            eq(teacherVocabularyProgress.userId, userId),
            eq(teacherVocabularyProgress.wordId, wordId),
        )).returning();
        return updated;
    },

    async deleteProgressByUserAndWordIds(userId: bigint, wordIds: bigint[]): Promise<void> {
        if (wordIds.length === 0) return;
        await db.delete(teacherVocabularyProgress)
            .where(and(
                eq(teacherVocabularyProgress.userId, userId),
                inArray(teacherVocabularyProgress.wordId, wordIds),
            ));
    },

    async findWordAudio(
        wordId: bigint,
        voice: string,
        language: string,
        contentHash: string,
    ): Promise<TeacherVocabularyWordAudioRow | undefined> {
        return db.select().from(teacherPhraseAudio)
            .where(and(
                eq(teacherPhraseAudio.scope, 'vocabulary_word'),
                eq(teacherPhraseAudio.scopeId, wordId),
                eq(teacherPhraseAudio.voice, voice),
                eq(teacherPhraseAudio.language, language),
                eq(teacherPhraseAudio.contentHash, contentHash),
            ))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findWordAudioByWordIds(
        wordIds: bigint[],
        voice: string,
        language: string,
        contentHashes: string[],
    ): Promise<TeacherVocabularyWordAudioRow[]> {
        if (wordIds.length === 0 || contentHashes.length === 0) return [];
        return db.select().from(teacherPhraseAudio)
            .where(and(
                eq(teacherPhraseAudio.scope, 'vocabulary_word'),
                inArray(teacherPhraseAudio.scopeId, wordIds),
                eq(teacherPhraseAudio.voice, voice),
                eq(teacherPhraseAudio.language, language),
                inArray(teacherPhraseAudio.contentHash, contentHashes),
            ));
    },

    async setWordAudio(
        wordId: bigint,
        voice: string,
        language: string,
        contentHash: string,
        voiceSrc: string,
    ): Promise<void> {
        const createdAt = new Date();
        await db.execute(sql`
            INSERT INTO teacher_phrase_audio (scope, scope_id, voice, language, content_hash, voice_src, created_at)
            VALUES ('vocabulary_word', ${wordId}, ${voice}, ${language}, ${contentHash}, ${voiceSrc}, ${createdAt})
            ON CONFLICT (scope, scope_id, voice, language, content_hash)
            DO NOTHING
        `);
    },

    async findExampleAudio(
        exampleId: bigint,
        voice: string,
        language: string,
        contentHash: string,
    ): Promise<TeacherVocabularyExampleAudioRow | undefined> {
        return db.select().from(teacherPhraseAudio)
            .where(and(
                eq(teacherPhraseAudio.scope, 'vocabulary_example'),
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
    ): Promise<TeacherVocabularyExampleAudioRow[]> {
        if (exampleIds.length === 0 || contentHashes.length === 0) return [];
        return db.select().from(teacherPhraseAudio)
            .where(and(
                eq(teacherPhraseAudio.scope, 'vocabulary_example'),
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
            VALUES ('vocabulary_example', ${exampleId}, ${voice}, ${language}, ${contentHash}, ${voiceSrc}, ${createdAt})
            ON CONFLICT (scope, scope_id, voice, language, content_hash)
            DO NOTHING
        `);
    },

    async findLegacyWordAudio(wordId: bigint, voice: string): Promise<{ voiceSrc: string } | undefined> {
        const result = await db.execute(sql`
            SELECT a.voice_src
            FROM teacher_vocabulary_word_audio a
            WHERE a.word_id = ${wordId}
              AND a.voice = ${voice}
            ORDER BY a.created_at DESC
            LIMIT 1
        `);

        const row = (result.rows as { voice_src: string }[]).at(0);
        return row !== undefined ? { voiceSrc: row.voice_src } : undefined;
    },

    async findLegacyExampleAudio(exampleId: bigint, voice: string): Promise<{ voiceSrc: string } | undefined> {
        const result = await db.execute(sql`
            SELECT a.voice_src
            FROM teacher_vocabulary_example_audio a
            WHERE a.example_id = ${exampleId}
              AND a.voice = ${voice}
            ORDER BY a.created_at DESC
            LIMIT 1
        `);

        const row = (result.rows as { voice_src: string }[]).at(0);
        return row !== undefined ? { voiceSrc: row.voice_src } : undefined;
    },
};
