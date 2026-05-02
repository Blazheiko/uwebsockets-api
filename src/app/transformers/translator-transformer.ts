import { DateTime } from 'luxon';
import type {
    TranslatorSessionRow,
    TranslatorMessageRow,
} from '#app/repositories/translator-repository.js';
import type { TranslatorRealtimeMessageRow } from '#app/repositories/translator-realtime-repository.js';

export type SerializedTranslatorSession = Omit<
    TranslatorSessionRow,
    'createdAt' | 'updatedAt' | 'id' | 'userId' | 'teacherVocabularyCollectionId'
> & {
    id: string;
    userId: string;
    teacherVocabularyCollectionId: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type SerializedTranslatorMessage = Omit<
    TranslatorMessageRow,
    'createdAt' | 'id' | 'sessionId'
> & {
    id: string;
    sessionId: string;
    created_at: string | null;
};

export type SerializedTranslatorRealtimeMessage = Omit<
    TranslatorRealtimeMessageRow,
    'createdAt' | 'updatedAt' | 'id' | 'sessionId'
> & {
    id: string;
    sessionId: string;
    created_at: string | null;
    updated_at: string | null;
};

export const translatorSessionTransformer = {
    serialize(session: TranslatorSessionRow): SerializedTranslatorSession {
        const { createdAt, updatedAt, id, userId, teacherVocabularyCollectionId, ...rest } = session;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            teacherVocabularyCollectionId: teacherVocabularyCollectionId !== null
                ? String(teacherVocabularyCollectionId)
                : null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
        };
    },

    serializeArray(sessions: TranslatorSessionRow[]): SerializedTranslatorSession[] {
        return sessions.map((s) => translatorSessionTransformer.serialize(s));
    },
};

export const translatorMessageTransformer = {
    serialize(message: TranslatorMessageRow): SerializedTranslatorMessage {
        const { createdAt, id, sessionId, ...rest } = message;
        return {
            ...rest,
            id: String(id),
            sessionId: String(sessionId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
        };
    },

    serializeArray(messages: TranslatorMessageRow[]): SerializedTranslatorMessage[] {
        return messages.map((m) => translatorMessageTransformer.serialize(m));
    },
};

export const translatorRealtimeMessageTransformer = {
    serialize(message: TranslatorRealtimeMessageRow): SerializedTranslatorRealtimeMessage {
        const { createdAt, updatedAt, id, sessionId, ...rest } = message;
        return {
            ...rest,
            id: String(id),
            sessionId: String(sessionId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
        };
    },

    serializeArray(messages: TranslatorRealtimeMessageRow[]): SerializedTranslatorRealtimeMessage[] {
        return messages.map((m) => translatorRealtimeMessageTransformer.serialize(m));
    },
};
