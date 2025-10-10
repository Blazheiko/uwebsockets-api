import logger from '#logger';
import User from '#app/models/user.js';
import { WsContext, WsData, WsResponseData } from '../../../vendor/types/types.js';
import { broadcastMessage } from '#vendor/start/server.js';
export default {
    eventTyping({ wsData, responseData}: WsContext) {
        logger.info('ws eventTyping');
        const { payload } = wsData;
        logger.info(payload);
        broadcastMessage(payload.contactId, 'event_typing', payload);

        return { status: 'ok'};
    },
    error() {
        logger.info('ws error');
        throw new Error('Test error');

        // return responseData;
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
