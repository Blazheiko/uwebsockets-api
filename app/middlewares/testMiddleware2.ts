import logger from '#logger';
import { HttpContext, HttpData, ResponseData, WsContext } from '../../vendor/types/types.js';

export default async ({ responseData } : HttpContext | WsContext, next: Function) => {
    logger.info('testMiddleware2.js');
    if ('middlewareData' in responseData) {
        responseData.middlewareData = { middleware2: 'TEST2' };
    }
    await next();
};
