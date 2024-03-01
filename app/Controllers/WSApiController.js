import logger from '#logger';

export default {
    test(wsData, responseData) {
        logger.info('ws test');
        responseData.payload = { test: true };

        return responseData;
    },
};
