
import { HttpContext, WsContext } from '../../vendor/types/types.js';

export default async ({ responseData, logger } : HttpContext | WsContext, next: Function) => {
    logger.info('testMiddleware2.js');
    if ('middlewareData' in responseData) {
        responseData.middlewareData = { middleware2: 'TEST2' };
    }
    // responseData.status = 401;
    await next();
};
