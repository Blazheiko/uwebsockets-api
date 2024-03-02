import logger from '#logger';
import { getWsRoutes } from '#vendor/start/router.js';

const wsRoutes = getWsRoutes();

export default async (message) => {
    const responseData = {
        payload: {},
        event: message.event,
        status: 200,
    };
    try {
        if (wsRoutes[message.event]) {
            const payload = message.payload
                ? Object.freeze({ ...message.payload })
                : null;
            const middlewares = wsRoutes[message.event].middlewares;
            if (middlewares && middlewares.length) {
                // handle middlewares
            }
            const handler = wsRoutes[message.event].handler;
            return await handler(payload, responseData);
        }
    } catch (e) {
        logger.error('error wsApiHandler');
        logger.error(e);
        responseData.status = 500;
        responseData.payload = { message: e.message };
    }

    return responseData;
};
