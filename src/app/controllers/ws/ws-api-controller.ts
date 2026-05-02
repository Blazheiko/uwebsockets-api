import logger from '#logger';
import type { WsContext } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { wsService } from '#app/services/ws-service.js';
import { videoCallMessageService } from '#app/services/video-call-message-service.js';
import type {
    ReadMessagesInput,
    RegisterInput,
    WSCallerIdPayload,
    WSEventTypingPayload,
    WSTargetUserIdPayload,
    WSVideoCallLogEndPayload,
    WSVideoCallLogStartPayload,
} from 'shared/schemas';
import type { UserConnection } from '#vendor/types/types.js';
import type {
    EventTypingResponse,
    ReadMessageResponse,
    IncomingCallResponse,
    AcceptCallResponse,
    DeclineCallResponse,
    WebrtcCallOfferResponse,
    WebrtcCallAnswerResponse,
    WebrtcIceCandidateResponse,
    WebrtcStartCallResponse,
    WebrtcCallEndResponse,
    WebrtcCancelCallResponse,
    WebrtcCallLogEndResponse,
    WebrtcCallLogStartResponse,
    TestWsResponse,
    WSSaveUserResponse,
    WSErrorResponse,
} from 'shared';

export default {
    eventTyping(context: WsContext<WSEventTypingPayload>): EventTypingResponse {
        return wsService.eventTyping(getTypedPayload(context));
    },

    async readMessage(context: WsContext<ReadMessagesInput>): Promise<ReadMessageResponse> {
        logger.info('ws readMessage');
        return wsService.readMessage(getTypedPayload(context));
    },

    async incomingCall(context: WsContext<WSEventTypingPayload>): Promise<IncomingCallResponse> {
        return wsService.incomingCall(getTypedPayload(context));
    },

    async acceptIncomingCall(context: WsContext<WSCallerIdPayload>): Promise<AcceptCallResponse> {
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        return wsService.acceptIncomingCall(
            getTypedPayload(context),
            userData?.userId !== undefined ? String(userData.userId) : undefined,
            userData?.uuid,
        );
    },

    async declineIncomingCall(context: WsContext<WSCallerIdPayload>): Promise<DeclineCallResponse> {
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        return wsService.declineIncomingCall(
            getTypedPayload(context),
            userData?.userId !== undefined ? String(userData.userId) : undefined,
            userData?.uuid,
        );
    },

    async webrtcCallOffer(context: WsContext<WSTargetUserIdPayload>): Promise<WebrtcCallOfferResponse> {
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        return wsService.webrtcCallOffer(
            getTypedPayload(context),
            userData?.userId !== undefined ? String(userData.userId) : undefined,
            userData?.uuid,
        );
    },

    async webrtcCallAnswer(context: WsContext<WSTargetUserIdPayload>): Promise<WebrtcCallAnswerResponse> {
        return wsService.webrtcCallAnswer(getTypedPayload(context));
    },

    async webrtcIceCandidate(context: WsContext<WSTargetUserIdPayload>): Promise<WebrtcIceCandidateResponse> {
        return wsService.webrtcIceCandidate(getTypedPayload(context));
    },

    async webrtcStartCall(context: WsContext<WSTargetUserIdPayload>): Promise<WebrtcStartCallResponse> {
        return wsService.webrtcStartCall(getTypedPayload(context));
    },

    async webrtcCallEnd(context: WsContext<WSTargetUserIdPayload>): Promise<WebrtcCallEndResponse> {
        logger.info('ws webrtcCallEnd');
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        return wsService.webrtcCallEnd(
            getTypedPayload(context),
            userData?.userId !== undefined ? String(userData.userId) : undefined,
            userData?.uuid,
        );
    },

    async webrtcCancelCall(context: WsContext<WSTargetUserIdPayload>): Promise<WebrtcCancelCallResponse> {
        logger.info('ws webrtcCancelCall');
        return wsService.webrtcCancelCall(getTypedPayload(context));
    },

    async webrtcCallLogStart(context: WsContext<WSVideoCallLogStartPayload>): Promise<WebrtcCallLogStartResponse> {
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        const payload = getTypedPayload(context);
        const result = await videoCallMessageService.startVideoCallLog(
            userData?.userId,
            payload.targetUserId,
            userData,
        );

        if (!result.ok) {
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', callMessage: result.data.message };
    },

    async webrtcCallLogEnd(context: WsContext<WSVideoCallLogEndPayload>): Promise<WebrtcCallLogEndResponse> {
        const { wsData } = context;
        const userData = wsData.middlewareData['userData'] as UserConnection | undefined;
        const payload = getTypedPayload(context);
        const result = await videoCallMessageService.finishVideoCallLog(
            userData?.userId,
            payload.targetUserId,
            payload.videoCallId,
            userData,
        );

        if (!result.ok) {
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', callMessage: result.data.message };
    },

    error(): WSErrorResponse {
        logger.info('ws error');
        throw new Error('Test error');
    },

    testWs(): TestWsResponse {
        logger.info('ws testWs');
        return wsService.testWs();
    },

    async saveUser(context: WsContext<RegisterInput>): Promise<WSSaveUserResponse> {
        logger.info('ws saveUser');
        return (await wsService.saveUser(
            getTypedPayload(context),
        )) as WSSaveUserResponse;
    },
};
