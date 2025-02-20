import logger from '#logger';

export default async (httpData, responseData, next) => {
    logger.info('testMiddleware2.js');
    responseData.middlewareData.middleware2 = 'TEST2';
    await next();
};
