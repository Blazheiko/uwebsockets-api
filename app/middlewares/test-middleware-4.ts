
import { HttpContext, WsContext } from '../../vendor/types/types.js';

export default async ({ responseData, logger } : HttpContext | WsContext, next: Function) => {
    logger.info('testMiddleware4.js');
    if ('middlewareData' in responseData) {
        responseData.middlewareData = { middleware4: 'TEST4', ...responseData.middlewareData };
    }
    // responseData.status = 401;
    await next();
};