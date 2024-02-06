import { router } from '#vendor/start/router.js';

export default () => {
    router.ws('test', (wsData, responseData) => {
        responseData.payload = wsData;
        return responseData;
    });
    router
        .group([
            router.ws('token', (wsData, responseData) => {
                responseData.payload = wsData;
                return responseData;
            }),
        ])
        .prefix('message:');
};
