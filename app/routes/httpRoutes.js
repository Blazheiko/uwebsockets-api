import { getWsRoutes, router } from '#vendor/start/router.js';
import MainController from '#app/Controllers/MainController.js';
import logger from "#logger";

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
        router.get('/set-header-and-cookie', (httpData, responseData) => {
            logger.info('set-header-and-cookie');
            responseData.headers.push({ name: 'test-header', value: 'test' });
            responseData.cookies.push({
                name: 'cookieTest',
                value: 'test',
                path: '/',
                httpOnly: true,
                secure: true,
                maxAge: 3600,
            });
            return responseData;
        }),
    ])
    .prefix('/api');
