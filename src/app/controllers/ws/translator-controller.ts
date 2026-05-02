import logger from '#logger';
import type { WsContext, UserConnection } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { translatorService } from '#app/services/translator-service.js';
import type {
    TranslatorStartInput,
    TranslatorTranslateInput,
    TranslatorEndInput,
} from 'shared/schemas';
import type {
    TranslatorStartResponse,
    TranslatorTranslateResponse,
    TranslatorEndResponse,
} from 'shared';

export default {
    async start(context: WsContext<TranslatorStartInput>): Promise<TranslatorStartResponse> {
        logger.info('ws translator start');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const result = await translatorService.startSession(
            BigInt(userData.userId),
            payload.langOwner,
            payload.langOpponent,
        );

        if (!result.ok) {
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', sessionId: result.data.sessionId };
    },

    async translate(context: WsContext<TranslatorTranslateInput>): Promise<TranslatorTranslateResponse> {
        logger.info('ws translator translate');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const result = await translatorService.translate(BigInt(userData.userId), {
            sessionId: payload.sessionId,
            side: payload.side,
            text: payload.text,
            sourceLang: payload.sourceLang,
            targetLang: payload.targetLang,
            inputType: payload.inputType,
        });

        if (!result.ok) {
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', messageId: result.data.messageId };
    },

    async end(context: WsContext<TranslatorEndInput>): Promise<TranslatorEndResponse> {
        logger.info('ws translator end');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const result = await translatorService.endSession(
            BigInt(userData.userId),
            payload.sessionId,
        );

        if (!result.ok) {
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', message: result.data.message };
    },
};
