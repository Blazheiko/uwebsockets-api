import { getWsRoutes } from '#vendor/start/router.js';
import executeMiddlewares from '#vendor/utils/executeMiddlewares.js';
import validators from '#vendor/start/validators.js';
import { WsData, WsResponseData, WsRoutes } from '../types/types.js';
import createWsContext from './createWsContext.js';

const wsRoutes: WsRoutes = getWsRoutes();

export default async (message: { event: string; payload?: any }, userData: unknown) => {

    const responseData: WsResponseData = {
        payload: {},
        event: message.event,
        status: 200,
    };
    try {
        const route = wsRoutes[message.event];
        if (route) {
            let payload = message.payload ? message.payload : null;
            if (route.validator) {
                const validator: any = validators.get(route.validator);
                if (validator) payload = await validator.validate(payload);
            }
            const wsData: WsData = {
                middlewareData: { userData },
                status: '200',
                payload: payload ? Object.freeze({ ...payload }) : null,
            };

            // const context = { wsData, responseData , session : null , auth: null};
            const context = await createWsContext(wsData, responseData );
            if (route.middlewares?.length) {

                await executeMiddlewares(route.middlewares, context);
            }
            const handler = route.handler;
            return await handler(context);
        }
        responseData.status = 404;
    } catch (e: any) {

        if (e.code === 'E_VALIDATION_ERROR') {
            // logger.error('WS E_VALIDATION_ERROR');
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
