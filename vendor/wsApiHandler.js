import logger from '#logger';
import { getWsRoutes } from '#vendor/start/router.js';
const wsRoutes = getWsRoutes();

export default async (message) => {
    try {
        if (wsRoutes[message.event]) {
            const middlewares = wsRoutes[message.event].middlewares;
            if (middlewares && middlewares.length) {
                // handle middlewares
            }
            const handler = wsRoutes[message.event].handler;
            return await handler(message);
        }
    } catch (e) {
        logger.info('error wsApiHandler');
    }

    return null;
};
