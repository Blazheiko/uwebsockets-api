import logger from '#logger';
import User from '#app/models/User.js';
import { WsContext, WsData, WsResponseData } from '../../../vendor/types/types.js';
import { broadcastMessage } from '#vendor/start/server.js';
import broadcastig from '#app/servises/broadcastig.js';
export default {
    eventTyping({ wsData, responseData}: WsContext) {
        logger.info('ws eventTyping');
        const { payload } = wsData;
        logger.info(payload);
        // broadcastMessage(payload.contactId, 'event_typing', payload);
        broadcastig.broadcastMessageToUser(payload.contactId, 'event_typing', payload);

        return { status: 'ok'};
    },
    incomingCall({ wsData, responseData}: WsContext) {
        logger.info('ws incomingCall');
        const { payload } = wsData;
        logger.info(payload);
        
        broadcastig.broadcastMessageToUser(payload.contactId, 'incoming_call', payload);
        return { status: 'ok', message: 'Incoming call event sent'};
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
    async saveUser({ wsData, responseData}: WsContext) {
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
