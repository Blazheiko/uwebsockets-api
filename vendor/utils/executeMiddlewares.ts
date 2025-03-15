import middlewaresKernel from '#app/middlewares/kernel.js';
import { HttpContext, RouteItem, WsContext } from '../types/types.js';
import logger from '../../logger.js';
// import logger from '#logger';
const executeMiddlewares = async (middlewares: string[] | undefined, context: HttpContext | WsContext) => {
    logger.info('executeMiddlewares');
    if (!middlewares || !middlewares.length) return true;
    let index = 0;
    let counter = 0;
    const next = async () => {
        counter++;
        if (index < middlewares.length) {
            const middlewareName = middlewares[index++];
            const middleware = middlewaresKernel[middlewareName];
            if (!middleware) throw new Error(`No middleware ${middlewareName}`);
            await middleware( context, next );
        }
    };
    await next();

    return middlewares.length === counter-1;
};

export default executeMiddlewares;
