// import { getWsRoutes, router } from '#vendor/start/router.js';
import MainController from '#app/controllers/http/MainController.js';
// import logger from '#logger';

export default [
    {
        url: '/',
        method: 'get',
        handler: MainController.index,
    },
    {
        url: '/save-user',
        method: 'post',
        handler: MainController.saveUser,
    },
    {
        url: '/test-middleware',
        method: 'get',
        handler: MainController.testMiddleware,
        middleware: ['test1'],
    },
    // {
    //     group: [
    //         {
    //             url: '/init',
    //             method: 'get',
    //             handler: MainController.init,
    //         },
    //     ],
    //     middleware: ['test2'],
    //     prefix: '/api',
    // },
];

// router.get('/', (httpData, responseData) => {
//     responseData.payload = httpData;
//     return responseData;
// });
// router
//     .group([
//         router.get('/init', MainController.init),
//         router.get('/token/:token', (httpData, responseData) => {
//             responseData.payload = httpData;
//             return responseData;
//         }),
//         router.post('/save-user', MainController.saveUser).validate('register'),
//         router.get('/get-ws-route', (httpData, responseData) => {
//             responseData.payload = getWsRoutes();
//             return responseData;
//         }),
//         router
//             .get('/test-middleware', (httpData, responseData) => {
//                 responseData.payload = responseData.middlewareData;
//                 return responseData;
//             })
//             .middleware(['test1']),
//         router.get('/set-header-and-cookie', (httpData, responseData) => {
//             logger.info('set-header-and-cookie');
//             responseData.headers.push({ name: 'test-header', value: 'test' });
//             responseData.cookies.push({
//                 name: 'cookieTest',
//                 value: 'test',
//                 path: '/',
//                 httpOnly: true,
//                 secure: true,
//                 maxAge: 3600,
//             });
//             return responseData;
//         }),
//     ])
//     .middleware(['test2'])
//     .prefix('/api');
