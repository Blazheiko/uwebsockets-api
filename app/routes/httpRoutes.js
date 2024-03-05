import { getWsRoutes, router } from '#vendor/start/router.js';
import MainController from '#app/controllers/http/MainController.js';
import logger from '#logger';
import testMiddleware from '#app/middlewares/testMiddleware.js';
import testMiddleware2 from '#app/middlewares/testMiddleware2.js';

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
        router.post('/save-user', MainController.saveUser).validate('register'),
        router.get('/get-ws-route', (httpData, responseData) => {
            responseData.payload = getWsRoutes();
            return responseData;
        }),
        router
            .get('/test-middleware', (httpData, responseData) => {
                responseData.payload = responseData.middlewareData;
                return responseData;
            })
            .middleware(['test1']),
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
    .middleware(['test2'])
    .prefix('/api');
