import middlewaresKernel from '#app/middlewares/kernel.js';
import logger from '#logger';
const executeMiddlewares = async (route, httpData, responseData) => {
    if (!route.middlewares || !route.middlewares.length) {
        responseData.payload = await route.handler(httpData, responseData);
        return;
    }
    const stack = route.middlewares.slice();
    const next = async (error) => {
        if (error) {
            logger.error('Middleware error:');
            logger.error(error);
            return;
        }
        const middlewareName = stack.shift();
        if (!middlewareName) {
            responseData.payload = await route.handler(httpData, responseData);
            return;
        }
        const middleware = middlewaresKernel[middlewareName];
        if (!middleware) throw new Error(`No middleware ${middlewareName}`);
        await middleware(httpData, responseData, next);
    };
    await next();
};

export default executeMiddlewares;
