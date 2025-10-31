import { getWsRoutes } from '#vendor/start/router.js';
import executeMiddlewares from '#vendor/utils/middlewares/core/execute-middlewares.js';
import validators from '#vendor/start/validators.js';
import {
    Session,
    SessionInfo,
    WsData,
    WsResponseData,
    WsRoutes,
    MyWebSocket,
} from '../../types/types.js';
import createWsContext from '../context/ws-context.js';
import checkRateLimitWs, {
    createWsRateLimitErrorResponse,
} from '../rate-limit/ws-rate-limit.js';
import logger from '#logger';

const wsRoutes: WsRoutes = getWsRoutes();

export default async (
    message: { event: string; payload?: any },
    ws: MyWebSocket,
    userData: unknown,
    session: Session,
) => {
    const responseData: WsResponseData = {
        data: {},
        event: message.event,
        status: 200,
        error: null,
    };
    try {
        const route = wsRoutes[message.event];
        if (route) {
            // Check rate limit before processing
            const rateLimitResult = await checkRateLimitWs(
                ws,
                route,
                route.groupRateLimit,
            );

            if (!rateLimitResult.allowed) {
                // Rate limit exceeded - return error response
                return createWsRateLimitErrorResponse(
                    rateLimitResult.errorMessage || 'Rate limit exceeded',
                    rateLimitResult.retryAfter || 60,
                    message.event,
                );
            }

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
            const context = await createWsContext(
                wsData,
                responseData,
                session,
            );
            if (
                !route.middlewares ||
                route.middlewares.length === 0 ||
                (await executeMiddlewares(route.middlewares, context))
            ) {
                const handler = route.handler;
                responseData.data = await handler(context);
            }

            return responseData;
        }
        responseData.status = 404;
        responseData.error = {
                code: 404,
                message: 'Route not found',
            };
    } catch (e: any) {
        if (e.code === 'E_VALIDATION_ERROR') {
            // logger.error('WS E_VALIDATION_ERROR');
            responseData.status = 422;
            responseData.error = {
                code: 422,
                message: 'Validation failure',
                messages: e.messages,
            };
        } else {
            responseData.status = 500;
            responseData.error = {
                code: 500,
                message: e.message,
            };
        }
    }

    return responseData;
};
