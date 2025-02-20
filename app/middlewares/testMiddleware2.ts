import logger from '#logger';
import { HttpData, ResponseData } from '../../vendor/types/types.js';

export default async (httpData: HttpData, responseData: ResponseData, next: Function) => {
    logger.info('testMiddleware2.js');
    responseData.middlewareData = { middleware2: 'TEST2' };
    await next();
};
