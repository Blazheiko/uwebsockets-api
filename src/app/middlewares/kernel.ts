import testMiddleware from '#app/middlewares/test-middleware.js';
import testMiddleware2 from '#app/middlewares/test-middleware-2.js';
import testMiddleware3 from '#app/middlewares/test-middleware-3.js';
import testMiddleware4 from '#app/middlewares/test-middleware-4.js';
import sessionWeb from '#vendor/utils/middlewares/ws/session-web.js';
import sessionAPI from '#vendor/utils/middlewares/http/session-api.js';
import authGuard from '#vendor/utils/middlewares/core/auth-guard.js';
import adminGuard from '#app/middlewares/admin-guard.js';
import partnerGuard from '#app/middlewares/partner-guard.js';

const middlewares: Record<string, Function> = {
    session_web: sessionWeb,
    session_api: sessionAPI,
    auth_guard: authGuard,
    admin_guard: adminGuard,
    partner_guard: partnerGuard,
    test1: testMiddleware,
    test2: testMiddleware2,
    test3: testMiddleware3,
    test4: testMiddleware4,
};
export default middlewares;
