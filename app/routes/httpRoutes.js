import { getWsRoutes, router } from '#vendor/start/router.js';

export default () => {
    router.get('/', (httpData, responseData) => {
        responseData.payload = httpData;
        return responseData;
    });
    router
        .group([
            router.get('/token/:token', (httpData, responseData) => {
                responseData.payload = httpData;
                return responseData;
            }),
            router.get('/get-ws-route', (httpData, responseData) => {
                responseData.payload = getWsRoutes();
                return responseData;
            }),
        ])
        .prefix('/api');
};
