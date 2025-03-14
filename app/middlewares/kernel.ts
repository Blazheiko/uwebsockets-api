import testMiddleware from '#app/middlewares/testMiddleware.js';
import testMiddleware2 from '#app/middlewares/testMiddleware2.js';
import sessionMiddleware from '../../vendor/utils/sessionMiddleware.js';

const middlewares: Record<string, Function> = {
    session: sessionMiddleware,
    test1: testMiddleware,
    test2: testMiddleware2,
};
export default middlewares;
