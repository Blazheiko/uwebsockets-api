import { HttpContext } from '../../../types/types.js';
import { sessionHandler } from '#vendor/utils/session/session-handler.js';

const sessionAPI = async (context: HttpContext, next: Function) => {
    const { httpData } = context;
    const headers = httpData.headers;
    const authorization = headers.get('authorization');
    let sessionId = '';
    if (authorization && authorization.startsWith('Bearer ')) {
        sessionId = authorization.slice(7);
    }
    await sessionHandler(context, sessionId, undefined);

    await next();
};

export default sessionAPI;
