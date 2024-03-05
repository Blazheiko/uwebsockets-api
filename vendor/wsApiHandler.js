import logger from '#logger';
import { getWsRoutes } from '#vendor/start/router.js';
import executeMiddlewares from '#vendor/utils/executeMiddlewares.js';
import validators from "#vendor/start/validators.js";

const wsRoutes = getWsRoutes();

export default async (message) => {
    const responseData = {
        payload: {},
        event: message.event,
        status: 200,
    };
    try {
        const route = wsRoutes[message.event];
        if (route) {
            let payload = message.payload
                ? Object.freeze({ ...message.payload })
                : null;
            if (route.validator) {
                const validator = validators[route.validator];
                if (validator) payload = await validator.validate(payload);
            }
            const wsData = {
                middlewareData: {},
                status: '200',
                payload,
            };
            if (route.middlewares?.length) {
                await executeMiddlewares(
                    route.middlewares,
                    wsData,
                    responseData,
                );
            }
            // const middlewares = wsRoutes[message.event].middlewares;
            // if (middlewares && middlewares.length) {
            //     // handle middlewares
            // }
            const handler = wsRoutes[message.event].handler;
            return await handler(wsData, responseData);
        }
    } catch (e) {
        logger.error('error wsApiHandler');
        logger.error(e);
        responseData.status = 500;
        responseData.payload = { message: e.message };
    }

    return responseData;
};
