import logger from '#logger';
import User from '#app/models/User.js';
import {
    WsContext,
    WsData,
    WsResponseData,
} from '../../../vendor/types/types.js';
import { broadcastMessage } from '#vendor/start/server.js';
import broadcastig from '#app/servises/broadcastig.js';
import readMessages from '#app/servises/chat/read-messages.js';
export default {
    eventTyping({ wsData }: WsContext) {
        // logger.info('ws eventTyping');
        const { payload } = wsData;
        // logger.info(payload);
        // broadcastMessage(payload.contactId, 'event_typing', payload);
        broadcastig.broadcastMessageToUser(
            payload.contactId,
            'event_typing',
            payload,
        );

        return { status: 'ok' };
    },
    async readMessage({ wsData }: WsContext) {
        logger.info('ws readMessage');
        const { payload } = wsData;
        logger.info(payload);
        await readMessages(BigInt(payload.userId), BigInt(payload.contactId));
        return { status: 'ok', message: 'Read message event sent' };
    },
    async incomingCall({ wsData }: WsContext) {
        // logger.info('ws incomingCall');
        const { payload } = wsData;
        // logger.info(payload);

        broadcastig.broadcastMessageToUser(
            payload.contactId,
            'incoming_call',
            payload,
        );
        return { status: 'ok', message: 'Incoming call event sent' };
    },
    async acceptIncomingCall({ wsData }: WsContext) {
        // logger.info('ws accept IncomingCall');
        const { payload } = wsData;
        // logger.info(payload);
        broadcastig.broadcastMessageToUser(
            payload.callerId,
            'accept_call',
            payload,
        );
        return { status: 'ok', message: 'Accept call event sent' };
    },
    async declineIncomingCall({ wsData }: WsContext) {
        // logger.info('ws declineIncomingCall');
        const { payload } = wsData;
        // logger.info(payload);
        broadcastig.broadcastMessageToUser(
            payload.callerId,
            'decline_call',
            payload,
        );
        return { status: 'ok', message: 'Decline call event sent' };
    },
    async webrtcCallOffer({ wsData }: WsContext) {
        // logger.info('ws webrtcCallOffer');
        const { payload } = wsData;
        // logger.info(payload);
        broadcastig.broadcastMessageToUser(
            payload.targetUserId,
            'webrtc_call_offer',
            payload,
        );
        return { status: 'ok', message: 'Webrtc call offer event sent' };
    },
    async webrtcCallAnswer({ wsData }: WsContext) {
        // logger.info('ws webrtcCallAnswer');
        const { payload } = wsData;
        // logger.info(payload);
        broadcastig.broadcastMessageToUser(
            payload.targetUserId,
            'webrtc_call_answer',
            payload,
        );
        return { status: 'ok', message: 'Webrtc call answer event sent' };
    },
    async webrtcIceCandidate({ wsData }: WsContext) {
        // logger.info('ws webrtcIceCandidate');
        const { payload } = wsData;
        // logger.info(payload);
        broadcastig.broadcastMessageToUser(
            payload.targetUserId,
            'webrtc_ice_candidate',
            payload,
        );
        return { status: 'ok', message: 'Webrtc ice candidate event sent' };
    },
    async webrtcStartCall({ wsData }: WsContext) {
        // logger.info('ws webrtcStartCall');
        const { payload } = wsData;
        // logger.info(payload);
        broadcastig.broadcastMessageToUser(
            payload.targetUserId,
            'webrtc_start_call',
            payload,
        );
        return { status: 'ok', message: 'Webrtc start call event sent' };
    },
    async webrtcCallEnd({ wsData }: WsContext) {
        logger.info('ws webrtcCallEnd');
        const { payload } = wsData;
        // logger.info(payload);
        broadcastig.broadcastMessageToUser(
            payload.targetUserId,
            'webrtc_call_end',
            payload,
        );
        return { status: 'ok', message: 'Webrtc call end event sent' };
    },
    async webrtcCancelCall({ wsData }: WsContext) {
        logger.info('ws webrtcCancelCall');
        const { payload } = wsData;
        // logger.info(payload);
        broadcastig.broadcastMessageToUser(
            payload.targetUserId,
            'webrtc_cancel_call',
            payload,
        );
        return { status: 'ok', message: 'Webrtc cancel call event sent' };
    },
    error() {
        logger.info('ws error');
        throw new Error('Test error');

        // return responseData;
    },
    testWs() {
        logger.info('ws testWs');
        return { status: 'ok', message: 'testWs' };
    },
    async saveUser({ wsData, responseData }: WsContext) {
        logger.info('ws saveUser');
        const { payload } = wsData;
        console.log({ payload });
        const user = await User.create({
            name: payload.name,
            email: payload.email,
            password: payload.password,
        });
        // console.log(user);

        return { status: 'ok', user };
    },
};
