import middlewaresKernel from '#app/middlewares/kernel.js';
import { HttpContext, RouteItem, WsContext } from '../types/types.js';
// import logger from '#logger';
const executeMiddlewares = async (middlewares: string[] | undefined, context: HttpContext | WsContext) => {
    if (!middlewares || !middlewares.length) return;
    let index = 0;
    const next = async () => {
        if (index < middlewares.length) {
            const middlewareName = middlewares[index++];
            const middleware = middlewaresKernel[middlewareName];
            if (!middleware) throw new Error(`No middleware ${middlewareName}`);
            await middleware( context, next);
        }
    };
    await next();
};

export default executeMiddlewares;
