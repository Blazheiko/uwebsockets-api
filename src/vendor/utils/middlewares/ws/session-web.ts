import type { HttpContext, Middleware} from '#vendor/types/types.js';
import sessionConfig from '#config/session.js';
// import logger from '../../logger.js';
import { sessionHandler } from '#vendor/utils/session/session-handler.js';

const sessionWeb: Middleware = async (context: HttpContext , next: () => Promise<void>): Promise<void> => {
    const { httpData } = context;
    const cookies = httpData.cookies;
    const sessionId = cookies.get(sessionConfig.cookieName);
    await sessionHandler(context, sessionId, undefined);

    await next();
};

export default sessionWeb;
