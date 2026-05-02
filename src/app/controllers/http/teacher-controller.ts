import type { HttpContext } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { teacherService } from '#app/services/teacher-service.js';
import type { TeacherRecordWordPracticeInput } from 'shared/schemas';
import type {
    TeacherGetProfileResponse,
    TeacherGetLessonsResponse,
    TeacherGetLessonByIdResponse,
    TeacherGetChatHistoryResponse,
    TeacherGetSessionLessonStatusResponse,
    TeacherDeleteChatHistoryResponse,
    TeacherDeleteFactsResponse,
    TeacherDeleteLessonsResponse,
    TeacherGetVocabularyCollectionsResponse,
    TeacherGetVocabularyCollectionResponse,
    TeacherDeleteVocabularyCollectionResponse,
    TeacherRecordWordPracticeResponse,
    TeacherWordAudioResponse,
    TeacherExampleAudioResponse,
} from 'shared';

function setServiceErrorStatus(
    context: HttpContext,
    code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL',
): void {
    if (code === 'BAD_REQUEST') {
        context.responseData.status = 400;
        return;
    }
    if (code === 'UNAUTHORIZED') {
        context.responseData.status = 401;
        return;
    }
    if (code === 'NOT_FOUND') {
        context.responseData.status = 404;
        return;
    }
    if (code === 'CONFLICT') {
        context.responseData.status = 409;
        return;
    }
    context.responseData.status = 500;
}

function resolveUserId(context: HttpContext): bigint | null {
    if (!context.auth.check()) {
        context.responseData.status = 401;
        return null;
    }
    const userId = context.auth.getUserId();
    if (userId === null) {
        context.responseData.status = 401;
        return null;
    }
    return BigInt(userId);
}

export default {
    async getProfile(context: HttpContext): Promise<TeacherGetProfileResponse> {
        context.logger.info('teacher getProfile handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const langLearning = context.httpData.query.get('langLearning') ?? 'en';
        const result = await teacherService.getProfile(userId, langLearning);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data ?? undefined };
    },

    async getLessons(context: HttpContext): Promise<TeacherGetLessonsResponse> {
        context.logger.info('teacher getLessons handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const langLearning = context.httpData.query.get('langLearning') ?? 'en';
        const limitStr = context.httpData.query.get('limit');
        const limit = limitStr !== null ? Number(limitStr) : undefined;
        const result = await teacherService.getLessons(userId, langLearning, limit);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data };
    },

    async getLessonById(context: HttpContext): Promise<TeacherGetLessonByIdResponse> {
        context.logger.info('teacher getLessonById handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { lessonId } = context.httpData.params as { lessonId: string };
        const result = await teacherService.getLessonById(userId, lessonId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data };
    },

    async getChatHistory(context: HttpContext): Promise<TeacherGetChatHistoryResponse> {
        context.logger.info('teacher getChatHistory handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const langLearning = context.httpData.query.get('langLearning') ?? 'en';
        const limitStr = context.httpData.query.get('limit');
        const limit = limitStr !== null ? Number(limitStr) : undefined;
        const result = await teacherService.getChatHistory(userId, langLearning, limit);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data };
    },

    async getSessionLessonStatus(context: HttpContext): Promise<TeacherGetSessionLessonStatusResponse> {
        context.logger.info('teacher getSessionLessonStatus handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { sessionId } = context.httpData.params as { sessionId: string };
        const result = await teacherService.getLessonStatusForSession(userId, sessionId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', exists: result.data.exists, lessonId: result.data.lessonId };
    },

    async deleteChatHistory(context: HttpContext): Promise<TeacherDeleteChatHistoryResponse> {
        context.logger.info('teacher deleteChatHistory handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const result = await teacherService.deleteChatHistory(userId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success' };
    },

    async deleteFacts(context: HttpContext): Promise<TeacherDeleteFactsResponse> {
        context.logger.info('teacher deleteFacts handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const result = await teacherService.deleteFacts(userId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success' };
    },

    async deleteLessons(context: HttpContext): Promise<TeacherDeleteLessonsResponse> {
        context.logger.info('teacher deleteLessons handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const result = await teacherService.deleteLessons(userId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success' };
    },

    async getVocabularyCollections(context: HttpContext): Promise<TeacherGetVocabularyCollectionsResponse> {
        context.logger.info('teacher getVocabularyCollections handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const langLearning = context.httpData.query.get('langLearning') ?? 'en';
        const result = await teacherService.getVocabularyCollections(userId, langLearning);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data, stats: result.data.stats };
    },

    async getVocabularyCollection(context: HttpContext): Promise<TeacherGetVocabularyCollectionResponse> {
        context.logger.info('teacher getVocabularyCollection handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { collectionId } = context.httpData.params as { collectionId: string };
        const result = await teacherService.getVocabularyCollectionWords(userId, collectionId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data };
    },

    async deleteVocabularyCollection(context: HttpContext): Promise<TeacherDeleteVocabularyCollectionResponse> {
        context.logger.info('teacher deleteVocabularyCollection handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { collectionId } = context.httpData.params as { collectionId: string };
        const result = await teacherService.deleteVocabularyCollection(userId, collectionId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', stats: result.data.stats };
    },

    async recordWordPractice(context: HttpContext<TeacherRecordWordPracticeInput>): Promise<TeacherRecordWordPracticeResponse> {
        context.logger.info('teacher recordWordPractice handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { wordId } = context.httpData.params as { wordId: string };
        const payload = getTypedPayload(context);
        const result = await teacherService.recordWordPractice(userId, wordId, payload);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data };
    },

    async getWordAudio(context: HttpContext): Promise<TeacherWordAudioResponse> {
        context.logger.info('teacher getWordAudio handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { wordId } = context.httpData.params as { wordId: string };
        const result = await teacherService.getWordAudio(userId, wordId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', audioUrl: result.data.audioUrl, voiceSrc: result.data.voiceSrc };
    },

    async getExampleAudio(context: HttpContext): Promise<TeacherExampleAudioResponse> {
        context.logger.info('teacher getExampleAudio handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { exampleId } = context.httpData.params as { exampleId: string };
        const result = await teacherService.getExampleAudio(userId, exampleId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', audioUrl: result.data.audioUrl, voiceSrc: result.data.voiceSrc };
    },
};
