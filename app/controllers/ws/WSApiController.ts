import logger from '#logger';
import User from '#app/models/User.js';
import { WsContext, WsData, WsResponseData } from '../../../vendor/types/types.js';

export default {
    test({ responseData}: WsContext) {
        logger.info('ws test');
        responseData.payload = { test: true };

        return responseData;
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
        responseData.payload = { status: 'ok', user };

        return responseData;
    },
};
