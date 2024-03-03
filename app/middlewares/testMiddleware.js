import logger from '#logger';

export default (httpData, responseData) => {
    logger.info('testMiddleware.js');
    responseData.middlewareData = {
        middleware: 'TEST',
    };
};
