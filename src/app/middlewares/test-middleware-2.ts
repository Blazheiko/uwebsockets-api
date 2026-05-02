import type { HttpContext, WsContext } from '#vendor/types/types.js';

export default async (
    { responseData, logger }: HttpContext | WsContext,
    next: () => Promise<void>,
): Promise<void> => {
    logger.info('testMiddleware2.js');
    if ('middlewareData' in responseData) {
        responseData.middlewareData = { middleware2: 'TEST2', ...responseData.middlewareData };
    }
    // responseData.status = 401;
    await next();
};
