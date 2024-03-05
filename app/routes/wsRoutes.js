import { router } from '#vendor/start/router.js';
import WSApiController from '#app/controllers/ws/WSApiController.js';

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
        router.ws('test', WSApiController.test),
        router.ws('error', WSApiController.error),
        router.ws('save-user', WSApiController.saveUser),
    ])
    .prefix('api:');
