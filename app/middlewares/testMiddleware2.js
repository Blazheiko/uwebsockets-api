import logger from '#logger';

export default (httpData, responseData) => {
    logger.info('testMiddleware2.js');
    responseData.middlewareData.middleware2 = 'TEST2';
};
