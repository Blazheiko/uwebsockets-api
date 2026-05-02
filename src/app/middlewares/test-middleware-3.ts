import type { HttpContext, WsContext } from '#vendor/types/types.js';

export default async (
    { responseData, logger }: HttpContext | WsContext,
    next: () => Promise<void>,
): Promise<void> => {
    logger.info('testMiddleware3.js');
    if ('middlewareData' in responseData) {
        responseData.middlewareData = { middleware3: 'TEST3', ...responseData.middlewareData };
    }
    // responseData.status = 401;
    await next();
};
