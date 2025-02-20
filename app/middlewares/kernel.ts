import testMiddleware from '#app/middlewares/testMiddleware.js';
import testMiddleware2 from '#app/middlewares/testMiddleware2.js';

const middlewares: Record<string, Function> = {
    test1: testMiddleware,
    test2: testMiddleware2,
};
export default middlewares;
