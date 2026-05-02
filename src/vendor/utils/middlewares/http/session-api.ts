import type { HttpContext, Middleware } from '#vendor/types/types.js';
import { sessionHandler } from '#vendor/utils/session/session-handler.js';

const sessionAPI: Middleware = async (context: HttpContext , next: () => Promise<void>): Promise<void> => {
    const { httpData } = context;
    const headers = httpData.headers;
    const authorization = headers.get('authorization');
    let sessionId = '';
    if (authorization !== undefined && typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
        sessionId = authorization.slice(7);
    }
    await sessionHandler(context, sessionId, undefined);

    await next();
};

export default sessionAPI;
