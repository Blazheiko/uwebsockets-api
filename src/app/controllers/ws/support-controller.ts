import type { WsContext, UserConnection } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { supportService } from '#app/services/support-service.js';
import type { SupportChatInput, SupportOpenChatInput } from 'shared/schemas';
import type { SupportChatResponse, SupportOpenChatResponse } from 'shared/responses';

export default {
    async openChat(context: WsContext<SupportOpenChatInput>): Promise<SupportOpenChatResponse> {
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);

        void supportService.openChat(
            BigInt(userData.userId),
            payload.withTts ?? false,
            userData.uuid,
        );

        return { status: 'ok' };
    },

    async chat(context: WsContext<SupportChatInput>): Promise<SupportChatResponse> {
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        if (userData?.userId === undefined) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);

        void supportService.chat(
            BigInt(userData.userId),
            payload.message,
            payload.withTts ?? false,
            userData.uuid,
        );

        return { status: 'ok' };
    },
};
