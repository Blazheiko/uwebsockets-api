import logger from '#logger';

export default {
    test(wsData, responseData) {
        logger.info('ws test');
        responseData.payload = { test: true };

        return responseData;
    },
    error(wsData, responseData) {
        logger.info('ws error');
        throw new Error('Test error');

        // return responseData;
    },
};
