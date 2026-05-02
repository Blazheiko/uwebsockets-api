import middlewaresKernel from '#app/middlewares/kernel.js';
import type { HttpContext} from '#vendor/types/types.js';
// import logger from '#logger';
const executeMiddlewares = async (
    middlewares: string[] | undefined,
    context: HttpContext ,
): Promise<boolean> => {
    if ( middlewares === undefined || middlewares.length === 0) {
        return true;
    }
    let index = 0;
    let counter = 0;
    const next = async (): Promise<void> => {
        counter++;
        if (index < middlewares.length) {
            const middlewareName = middlewares[index++];
            if (middlewareName === undefined) throw new Error('Middleware name is undefined');
            const middleware = middlewaresKernel[middlewareName];
            if (middleware === undefined) throw new Error(`No middleware ${middlewareName}`);
            await middleware(context, next);
        }
    };
    await next();

    return middlewares.length === counter - 1;
};

export default executeMiddlewares;
