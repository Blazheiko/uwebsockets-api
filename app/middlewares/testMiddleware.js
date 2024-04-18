import logger from '#logger';

export default async (httpData, responseData, next) => {
    logger.info('testMiddleware.js');
    responseData.middlewareData.middleware1 = 'TEST1';
    responseData.status = '401 Unauthorized';
    await next();
};
