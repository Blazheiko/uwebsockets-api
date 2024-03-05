import middlewaresKernel from '#app/middlewares/kernel.js';
import logger from '#logger';
const executeMiddlewares = async (middlewares, httpData, responseData) => {
    const stack = middlewares.slice();
    const next = async (error) => {
        if (error) {
            logger.error('Middleware error:');
            logger.error(error);
            return;
        }
        const middlewareName = stack.shift();
        if (!middlewareName) return;
        const middleware = middlewaresKernel[middlewareName];
        if (!middleware) return;
        await middleware(httpData, responseData, next);
    };
    await next();
};

export default executeMiddlewares;
