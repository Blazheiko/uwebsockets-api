import logger from '#logger';
import { getWsRoutes } from '#vendor/start/router.js';
import executeMiddlewares from '#vendor/utils/executeMiddlewares.js';
import validators from '#vendor/start/validators.js';

const wsRoutes = getWsRoutes();

export default async (message) => {
    logger.info('ws API Handler');
    logger.info(message);
    const responseData = {
        payload: {},
        event: message.event,
        status: 200,
    };
    try {
        const route = wsRoutes[message.event];
        if (route) {
            let payload = message.payload ? message.payload : null;
            if (route.validator) {
                const validator = validators[route.validator];
                if (validator) payload = await validator.validate(payload);
            }
            const wsData = {
                middlewareData: {},
                status: '200',
                payload: payload ? Object.freeze({ ...payload }) : null,
            };
            if (route.middlewares?.length) {
                await executeMiddlewares(
                    route.middlewares,
                    wsData,
                    responseData,
                );
            }
            const handler = route.handler;
            return await handler(wsData, responseData);
        }
        responseData.status = 404;
    } catch (e) {
        logger.error('error wsApiHandler');
        logger.error(e);
        if (e.code === 'E_VALIDATION_ERROR') {
            logger.error('WS E_VALIDATION_ERROR');
            responseData.status = 422;
            responseData.payload = {
                message: 'Validation failure',
                messages: e.messages,
            };
        } else {
            responseData.status = 500;
            responseData.payload = { message: e.message };
        }
    }

    return responseData;
};
