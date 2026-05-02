import { DateTime } from 'luxon';
import type {
    TeacherProfileRow,
    TeacherLessonRow,
    TeacherChatMessageRow,
} from '#app/repositories/teacher-repository.js';
import type {
    TeacherVocabularyBatchRow,
    TeacherVocabularyCollectionRow,
    TeacherVocabularyExampleAudioRow,
    TeacherVocabularyExampleRow,
    TeacherVocabularyProgressRow,
    TeacherVocabularyWordAudioRow,
    TeacherVocabularyWordRow,
} from '#app/repositories/teacher-vocabulary-repository.js';

export type SerializedTeacherProfile = Omit<
    TeacherProfileRow,
    'createdAt' | 'updatedAt' | 'id' | 'userId'
> & {
    id: string;
    userId: string;
    created_at: string | null;
    updated_at: string | null;
};

export type SerializedTeacherLesson = Omit<
    TeacherLessonRow,
    'createdAt' | 'id' | 'userId' | 'sessionId' | 'vocabulary'
> & {
    id: string;
    userId: string;
    sessionId: string | null;
    vocabulary: { word: string; translation: string; example: string }[] | null;
    created_at: string | null;
};

export type SerializedTeacherChatMessage = Omit<
    TeacherChatMessageRow,
    'createdAt' | 'id' | 'userId'
> & {
    id: string;
    userId: string;
    created_at: string | null;
};

export type SerializedTeacherVocabularyCollection = Omit<
    TeacherVocabularyCollectionRow,
    'id' | 'userId' | 'embedding' | 'createdAt' | 'updatedAt'
> & {
    id: string;
    created_at: string | null;
    updated_at: string | null;
};

export type SerializedTeacherVocabularyBatch = Omit<
    TeacherVocabularyBatchRow,
    'id' | 'collectionId' | 'createdAt' | 'startedAt' | 'completedAt'
> & {
    id: string;
    collectionId: string;
    created_at: string | null;
    started_at: string | null;
    completed_at: string | null;
};

export type SerializedTeacherVocabularyExample = Omit<
    TeacherVocabularyExampleRow,
    'id' | 'wordId' | 'createdAt'
> & {
    id: string;
    wordId: string;
    voiceSrc: string | null;
    created_at: string | null;
};

export type SerializedTeacherVocabularyProgress = Omit<
    TeacherVocabularyProgressRow,
    'userId' | 'wordId' | 'pronunciationScore' | 'recognitionScore' | 'nextReviewAt' | 'lastPracticedAt' | 'lastCorrectAt' | 'updatedAt'
> & {
    wordId: string;
    pronunciationScore: number;
    recognitionScore: number;
    next_review_at: string | null;
    last_practiced_at: string | null;
    last_correct_at: string | null;
    updated_at: string | null;
};

export type SerializedTeacherVocabularyWord = Omit<
    TeacherVocabularyWordRow,
    'id' | 'collectionId' | 'batchId' | 'normalizedWord' | 'sortOrder' | 'createdAt'
> & {
    id: string;
    collectionId: string;
    batchId: string | null;
    normalizedWord: string;
    sortOrder: number;
    wordVoiceSrc: string | null;
    created_at: string | null;
    examples?: SerializedTeacherVocabularyExample[];
    progress?: SerializedTeacherVocabularyProgress | null;
};

export const teacherProfileTransformer = {
    serialize(row: TeacherProfileRow): SerializedTeacherProfile {
        const { createdAt, updatedAt, id, userId, ...rest } = row;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
        };
    },
};

export const teacherLessonTransformer = {
    serialize(row: TeacherLessonRow): SerializedTeacherLesson {
        const { createdAt, id, userId, sessionId, vocabulary, ...rest } = row;

        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            sessionId: sessionId !== null ? String(sessionId) : null,
            vocabulary: Array.isArray(vocabulary) ? vocabulary : null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
        };
    },

    serializeArray(rows: TeacherLessonRow[]): SerializedTeacherLesson[] {
        return rows.map((r) => teacherLessonTransformer.serialize(r));
    },
};

export const teacherChatMessageTransformer = {
    serialize(row: TeacherChatMessageRow): SerializedTeacherChatMessage {
        const { createdAt, id, userId, ...rest } = row;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
        };
    },

    serializeArray(rows: TeacherChatMessageRow[]): SerializedTeacherChatMessage[] {
        return rows.map((r) => teacherChatMessageTransformer.serialize(r));
    },
};

export const teacherVocabularyCollectionTransformer = {
    serialize(row: TeacherVocabularyCollectionRow): SerializedTeacherVocabularyCollection {
        const { id, userId: _userId, embedding: _embedding, createdAt, updatedAt, ...rest } = row;
        return {
            ...rest,
            id: String(id),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
        };
    },

    serializeArray(rows: TeacherVocabularyCollectionRow[]): SerializedTeacherVocabularyCollection[] {
        return rows.map((row) => teacherVocabularyCollectionTransformer.serialize(row));
    },
};

export const teacherVocabularyBatchTransformer = {
    serialize(row: TeacherVocabularyBatchRow): SerializedTeacherVocabularyBatch {
        const { id, collectionId, createdAt, startedAt, completedAt, ...rest } = row;
        return {
            ...rest,
            id: String(id),
            collectionId: String(collectionId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            started_at: startedAt !== null ? DateTime.fromJSDate(startedAt).toISO() : null,
            completed_at: completedAt !== null ? DateTime.fromJSDate(completedAt).toISO() : null,
        };
    },
};

export const teacherVocabularyExampleTransformer = {
    serialize(
        row: TeacherVocabularyExampleRow,
        audioRow?: TeacherVocabularyExampleAudioRow | null,
    ): SerializedTeacherVocabularyExample {
        const { id, wordId, createdAt, ...rest } = row;
        return {
            ...rest,
            id: String(id),
            wordId: String(wordId),
            voiceSrc: audioRow?.voiceSrc ?? null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
        };
    },

    serializeArray(
        rows: TeacherVocabularyExampleRow[],
        audioByExampleId?: Map<bigint, TeacherVocabularyExampleAudioRow>,
    ): SerializedTeacherVocabularyExample[] {
        return rows.map((row) =>
            teacherVocabularyExampleTransformer.serialize(row, audioByExampleId?.get(row.id)),
        );
    },
};

export const teacherVocabularyProgressTransformer = {
    serialize(row: TeacherVocabularyProgressRow): SerializedTeacherVocabularyProgress {
        const { userId: _userId, wordId, pronunciationScore, recognitionScore, nextReviewAt, lastPracticedAt, lastCorrectAt, updatedAt, ...rest } = row;
        return {
            ...rest,
            wordId: String(wordId),
            pronunciationScore: Number(pronunciationScore),
            recognitionScore: Number(recognitionScore),
            next_review_at: nextReviewAt !== null ? DateTime.fromJSDate(nextReviewAt).toISO() : null,
            last_practiced_at: lastPracticedAt !== null ? DateTime.fromJSDate(lastPracticedAt).toISO() : null,
            last_correct_at: lastCorrectAt !== null ? DateTime.fromJSDate(lastCorrectAt).toISO() : null,
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
        };
    },
};

export const teacherVocabularyWordTransformer = {
    serialize(
        row: TeacherVocabularyWordRow,
        extras?: {
            examples?: TeacherVocabularyExampleRow[];
            progress?: TeacherVocabularyProgressRow | null;
            wordAudio?: TeacherVocabularyWordAudioRow | null;
            exampleAudios?: Map<bigint, TeacherVocabularyExampleAudioRow>;
        },
    ): SerializedTeacherVocabularyWord {
        const { id, collectionId, batchId, normalizedWord, sortOrder, createdAt, ...rest } = row;
        const serialized: SerializedTeacherVocabularyWord = {
            ...rest,
            id: String(id),
            collectionId: String(collectionId),
            batchId: batchId !== null ? String(batchId) : null,
            normalizedWord,
            sortOrder,
            wordVoiceSrc: extras?.wordAudio?.voiceSrc ?? null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
        };
        if (extras?.examples !== undefined) {
            serialized.examples = teacherVocabularyExampleTransformer.serializeArray(
                extras.examples,
                extras.exampleAudios,
            );
        }
        if (extras?.progress !== undefined) {
            serialized.progress =
                extras.progress !== null
                    ? teacherVocabularyProgressTransformer.serialize(extras.progress)
                    : null;
        }
        return serialized;
    },
};
