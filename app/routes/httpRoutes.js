import { getWsRoutes, router } from '#vendor/start/router.js';
import MainController from '#app/Controllers/MainController.js';

router.get('/', (httpData, responseData) => {
    responseData.payload = httpData;
    return responseData;
});
router
    .group([
        router.get('/init', MainController.init),
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
