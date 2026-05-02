import type { HttpContext } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { teacherSyntaxService } from '#app/services/teacher-syntax-service.js';
import type {
    TeacherSkipSyntaxPronunciationInput,
    TeacherSubmitSyntaxAnswerInput,
} from 'shared/schemas';
import type {
    TeacherGetSyntaxLessonsResponse,
    TeacherGetSyntaxLessonResponse,
    TeacherDeleteSyntaxLessonResponse,
    TeacherStartSyntaxAttemptResponse,
    TeacherSubmitSyntaxAnswerResponse,
    TeacherSubmitSyntaxPronunciationResponse,
    TeacherSkipSyntaxPronunciationResponse,
    TeacherExampleAudioResponse,
} from 'shared/responses';

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
    async getSyntaxLessons(context: HttpContext): Promise<TeacherGetSyntaxLessonsResponse> {
        context.logger.info('teacher getSyntaxLessons handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const langLearning = context.httpData.query.get('langLearning') ?? 'en';
        const result = await teacherSyntaxService.getSyntaxLessons(userId, langLearning);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data };
    },

    async getSyntaxLesson(context: HttpContext): Promise<TeacherGetSyntaxLessonResponse> {
        context.logger.info('teacher getSyntaxLesson handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { lessonId } = context.httpData.params as { lessonId: string };
        const result = await teacherSyntaxService.getSyntaxLessonDetail(userId, lessonId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data };
    },

    async deleteSyntaxLesson(context: HttpContext): Promise<TeacherDeleteSyntaxLessonResponse> {
        context.logger.info('teacher deleteSyntaxLesson handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { lessonId } = context.httpData.params as { lessonId: string };
        const result = await teacherSyntaxService.deleteSyntaxLesson(userId, lessonId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success' };
    },

    async startSyntaxAttempt(context: HttpContext): Promise<TeacherStartSyntaxAttemptResponse> {
        context.logger.info('teacher startSyntaxAttempt handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { lessonId } = context.httpData.params as { lessonId: string };
        const result = await teacherSyntaxService.startAttempt(userId, lessonId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data.data };
    },

    async submitSyntaxAnswer(context: HttpContext<TeacherSubmitSyntaxAnswerInput>): Promise<TeacherSubmitSyntaxAnswerResponse> {
        context.logger.info('teacher submitSyntaxAnswer handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { lessonId, exerciseId } = context.httpData.params as { lessonId: string; exerciseId: string };
        const { answer, attemptId } = getTypedPayload(context);
        const result = await teacherSyntaxService.submitAnswer(userId, lessonId, attemptId, exerciseId, answer);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', data: result.data };
    },

    async submitSyntaxPronunciation(context: HttpContext<Record<string, string>>): Promise<TeacherSubmitSyntaxPronunciationResponse> {
        context.logger.info('teacher submitSyntaxPronunciation handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { lessonId, exerciseId } = context.httpData.params as { lessonId: string; exerciseId: string };
        const attemptId = context.httpData.payload?.['attemptId'];
        const file = context.httpData.files?.get('audio');
        if (typeof attemptId !== 'string' || attemptId.length === 0 || file === undefined) {
            context.responseData.status = 400;
            return { status: 'error', message: 'Audio and attemptId are required' };
        }

        const mimeType = file.type.split(';')[0] ?? file.type;
        const result = await teacherSyntaxService.submitPronunciation(
            userId,
            lessonId,
            exerciseId,
            attemptId,
            file.data,
            mimeType,
        );
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return {
            status: 'success',
            outcome: result.data.outcome,
            attempt: result.data.data,
            progress: result.data.progress,
        };
    },

    async skipSyntaxPronunciation(
        context: HttpContext<TeacherSkipSyntaxPronunciationInput>,
    ): Promise<TeacherSkipSyntaxPronunciationResponse> {
        context.logger.info('teacher skipSyntaxPronunciation handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { lessonId, exerciseId } = context.httpData.params as { lessonId: string; exerciseId: string };
        const { attemptId, reason } = getTypedPayload(context);
        const result = await teacherSyntaxService.skipPronunciation(
            userId,
            lessonId,
            exerciseId,
            attemptId,
            reason,
        );
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return {
            status: 'success',
            attempt: result.data.data,
            progress: result.data.progress,
        };
    },

    async getSyntaxExampleAudio(context: HttpContext): Promise<TeacherExampleAudioResponse> {
        context.logger.info('teacher getSyntaxExampleAudio handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { exampleId } = context.httpData.params as { exampleId: string };
        const result = await teacherSyntaxService.getSyntaxExampleAudio(userId, exampleId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', audioUrl: result.data.audioUrl, voiceSrc: result.data.voiceSrc };
    },

    async getSyntaxExerciseAudio(context: HttpContext): Promise<TeacherExampleAudioResponse> {
        context.logger.info('teacher getSyntaxExerciseAudio handler');
        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }
        const { lessonId, exerciseId } = context.httpData.params as { lessonId: string; exerciseId: string };
        const result = await teacherSyntaxService.getSyntaxExerciseAudio(userId, lessonId, exerciseId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'success', audioUrl: result.data.audioUrl, voiceSrc: result.data.voiceSrc };
    },
};
