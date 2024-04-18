import logger from '#logger';

export default async (httpData, responseData, next) => {
    logger.info('testMiddleware.js');
    responseData.middlewareData.middleware1 = 'TEST1';
    responseData.payload = {
        status: 'testMiddleware end',
        middleware1: 'TEST1',
    };
    responseData.status = 401;
    // await next();
};
