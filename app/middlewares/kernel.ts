import testMiddleware from '#app/middlewares/testMiddleware.js';
import testMiddleware2 from '#app/middlewares/testMiddleware2.js';
import sessionWeb from '#vendor/utils/sessionWeb.js';
import sessionAPI from '#vendor/utils/sessionAPI.js';

const middlewares: Record<string, Function> = {
    session_web: sessionWeb,
    session_api: sessionAPI,
    test1: testMiddleware,
    test2: testMiddleware2,
};
export default middlewares;
