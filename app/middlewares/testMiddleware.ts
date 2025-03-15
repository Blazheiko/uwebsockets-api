import logger from '#logger';
import { HttpContext, HttpData, ResponseData, WsContext } from '../../vendor/types/types.js';

export default async ( { responseData } : HttpContext | WsContext, next: Function) => {
    logger.info('testMiddleware.js');
    if ('middlewareData' in responseData) {
        responseData.middlewareData = { middleware1: 'TEST1' };
    }
    // responseData.status = '401 Unauthorized';
    await next();
};
