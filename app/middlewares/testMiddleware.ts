import logger from '#logger';
import { HttpData, ResponseData } from '../../vendor/types/types.js';

export default async (httpData: HttpData, responseData: ResponseData, next: Function) => {
    logger.info('testMiddleware.js');
    responseData.middlewareData = { middleware1: 'TEST1' };
    // responseData.status = '401 Unauthorized';
    await next();
};
