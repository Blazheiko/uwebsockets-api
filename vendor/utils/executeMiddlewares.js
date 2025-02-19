import middlewaresKernel from '#app/middlewares/kernel.js';
// import logger from '#logger';
const executeMiddlewares = async (route, httpData, responseData) => {
    if (!route.middlewares || !route.middlewares.length) return;
    const middlewares = route.middlewares;
    let index = 0;
    const next = async () => {
        if (index < middlewares.length) {
            const middlewareName = middlewares[index++];
            const middleware = middlewaresKernel[middlewareName];
            if (!middleware) throw new Error(`No middleware ${middlewareName}`);
            await middleware(httpData, responseData, next);
        }
    };
    await next();
};

export default executeMiddlewares;
