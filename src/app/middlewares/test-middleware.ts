import type { HttpContext, WsContext } from '#vendor/types/types.js';

export default async (
    { responseData, logger }: HttpContext | WsContext,
    next: () => Promise<void>,
): Promise<void> => {
    logger.info('testMiddleware.js');
    if ('middlewareData' in responseData) {
        responseData.middlewareData = { middleware1: 'TEST1', ...responseData.middlewareData };
    }
    // responseData.status = '401 Unauthorized';
    await next();
};
