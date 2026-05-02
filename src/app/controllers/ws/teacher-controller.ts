import logger from '#logger';
import type { WsContext, UserConnection } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { teacherService } from '#app/services/teacher-service.js';
import {
    peekProposal,
    deleteProposal,
    clearVocabularyIntent,
} from '#app/services/actions/pending-proposals.js';
import { teacherSyntaxService } from '#app/services/teacher-syntax-service.js';
import type {
    TeacherChatInput,
    TeacherGenerateVocabularyInput,
    TeacherGenerateVocabularyFromSessionInput,
    TeacherGetLessonInput,
    TeacherOpenChatInput,
    TeacherConfirmVocabularyInput,
    TeacherGenerateSyntaxLessonInput,
} from 'shared/schemas';
import type {
    TeacherChatResponse,
    TeacherConfirmVocabularyResponse,
    TeacherGenerateVocabularyResponse,
    TeacherGetLessonResponse,
    TeacherOpenChatResponse,
    TeacherGenerateSyntaxLessonResponse,
} from 'shared';

export default {
    async openChat(context: WsContext<TeacherOpenChatInput>): Promise<TeacherOpenChatResponse> {
        logger.info('ws teacher openChat');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);

        void teacherService.openChat(
            BigInt(userData.userId),
            payload.langLearning,
            payload.withTts ?? false,
            userData.uuid,
        );

        return { status: 'ok' };
    },

    async chat(context: WsContext<TeacherChatInput>): Promise<TeacherChatResponse> {
        logger.info('ws teacher chat');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);

        void teacherService.chat(
            BigInt(userData.userId),
            payload.message,
            payload.langLearning,
            payload.isFirstChat,
            payload.lessonId,
            payload.withTts ?? false,
            userData.uuid,
        );

        return { status: 'ok' };
    },

    async getLesson(context: WsContext<TeacherGetLessonInput>): Promise<TeacherGetLessonResponse> {
        logger.info('ws teacher getLesson');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const userId = BigInt(userData.userId);

        // Validate the session belongs to the user by fetching it
        const { translatorRepository } = await import('#app/repositories/index.js');
        const session = await translatorRepository.findSessionById(BigInt(payload.sessionId));
        if (session === undefined) {
            return { status: 'error', message: 'Session not found' };
        }
        if (session.userId !== userId) {
            return { status: 'error', message: 'Session does not belong to this user' };
        }

        void teacherService.generateLesson(
            userId,
            session.id,
            payload.langLearning,
            session.langOwner,
        );

        return { status: 'ok' };
    },

    async confirmVocabulary(context: WsContext<TeacherConfirmVocabularyInput>): Promise<TeacherConfirmVocabularyResponse> {
        logger.info('ws teacher confirmVocabulary');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);

        // Peek first — do NOT delete until ownership is verified
        const proposal = peekProposal(payload.proposalId);
        if (proposal === undefined) {
            return { status: 'error', message: 'Proposal not found or expired' };
        }

        const userId = BigInt(userData.userId);
        if (proposal.userId !== userId) {
            return { status: 'error', message: 'Proposal does not belong to this user' };
        }

        // Ownership confirmed — consume the proposal now
        deleteProposal(payload.proposalId);

        const result = await teacherService.generateVocabulary(
            userId,
            proposal.langLearning,
            proposal.description,
            undefined,
            proposal.topic,
            proposal.levelCode,
        );

        if (!result.ok) {
            return { status: 'error', message: result.message };
        }
        return {
            status: 'ok',
            ...(result.data.batchId !== undefined ? { batchId: result.data.batchId } : {}),
            collectionId: result.data.collectionId,
            reused: result.data.reused,
        };
    },

    async cancelVocabulary(context: WsContext<TeacherConfirmVocabularyInput>): Promise<TeacherConfirmVocabularyResponse> {
        logger.info('ws teacher cancelVocabulary');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const proposal = peekProposal(payload.proposalId);
        if (proposal === undefined) {
            return { status: 'error', message: 'Proposal not found or expired' };
        }

        const userId = BigInt(userData.userId);
        if (proposal.userId !== userId) {
            return { status: 'error', message: 'Proposal does not belong to this user' };
        }

        deleteProposal(payload.proposalId);
        clearVocabularyIntent(String(userId));
        return { status: 'ok' };
    },

    async generateSyntaxLesson(context: WsContext<TeacherGenerateSyntaxLessonInput>): Promise<TeacherGenerateSyntaxLessonResponse> {
        logger.info('ws teacher generateSyntaxLesson');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const result = await teacherSyntaxService.generateSyntaxLesson(
            BigInt(userData.userId),
            payload.topic,
            payload.levelCode,
        );
        if (!result.ok) {
            return { status: 'error', message: result.message };
        }
        return { status: 'ok', lessonId: result.data.lessonId };
    },

    async generateVocabulary(context: WsContext<TeacherGenerateVocabularyInput>): Promise<TeacherGenerateVocabularyResponse> {
        logger.info('ws teacher generateVocabulary');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const result = await teacherService.generateVocabulary(
            BigInt(userData.userId),
            payload.langLearning,
            payload.description,
            undefined,
            payload.topic,
            payload.levelCode,
        );
        if (!result.ok) {
            return { status: 'error', message: result.message };
        }
        return {
            status: 'ok',
            ...(result.data.batchId !== undefined ? { batchId: result.data.batchId } : {}),
            collectionId: result.data.collectionId,
            reused: result.data.reused,
        };
    },

    async generateVocabularyFromSession(context: WsContext<TeacherGenerateVocabularyFromSessionInput>): Promise<TeacherGenerateVocabularyResponse> {
        logger.info('ws teacher generateVocabularyFromSession');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const userId = BigInt(userData.userId);

        const { translatorRepository } = await import('#app/repositories/index.js');
        const session = await translatorRepository.findSessionById(BigInt(payload.sessionId));
        if (session === undefined) {
            return { status: 'error', message: 'Session not found' };
        }
        if (session.userId !== userId) {
            return { status: 'error', message: 'Session does not belong to this user' };
        }

        // Already created — return existing collectionId
        if (session.teacherVocabularyCollectionId !== null) {
            return {
                status: 'ok',
                collectionId: String(session.teacherVocabularyCollectionId),
            };
        }

        // Build description from session summary or fallback, clamped to 240 chars (vocabulary purpose limit)
        const fallback = `Vocabulary from translation session: ${session.langOwner} ↔ ${session.langOpponent}`;
        const rawDesc = (session.descriptionOwner !== null && session.descriptionOwner.trim().length >= 10)
            ? session.descriptionOwner.trim()
            : fallback;
        const description = rawDesc.length > 240 ? rawDesc.slice(0, 237) + '...' : rawDesc;

        const result = await teacherService.generateVocabulary(
            userId,
            payload.langLearning,
            description,
        );
        if (!result.ok) {
            return { status: 'error', message: result.message };
        }

        // Link the collection to the session
        const linked = await translatorRepository.updateVocabularyCollectionId(
            session.id,
            BigInt(result.data.collectionId),
        );
        if (!linked) {
            logger.warn({ sessionId: payload.sessionId, collectionId: result.data.collectionId }, 'Failed to link vocabulary collection to session');
            return { status: 'error', message: 'Failed to save vocabulary link to session' };
        }

        return {
            status: 'ok',
            ...(result.data.batchId !== undefined ? { batchId: result.data.batchId } : {}),
            collectionId: result.data.collectionId,
            reused: result.data.reused,
        };
    },
};
