import testMiddleware from '#app/middlewares/test-middleware.js';
import testMiddleware2 from '#app/middlewares/test-middleware-2.js';
import sessionWeb from '#vendor/utils/middlewares/ws/session-web.js';
import sessionAPI from '#vendor/utils/middlewares/http/session-api.js';
import authGuard from '#vendor/utils/middlewares/core/auth-guard.js';

const middlewares: Record<string, Function> = {
    session_web: sessionWeb,
    session_api: sessionAPI,
    auth_guard: authGuard,
    test1: testMiddleware,
    test2: testMiddleware2,
};
export default middlewares;
