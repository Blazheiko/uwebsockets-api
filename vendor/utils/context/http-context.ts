import {
    Auth,
    HttpContext,
    HttpData,
    ResponseData,
    Session,
} from '../../types/types.js';

import logger from '#logger';
import { randomUUID } from 'crypto';

const getDefaultSession = (): Session => ({
    sessionInfo: null,
    updateSessionData: () => null,
    changeSessionData: () => null,
    destroySession: () => 0,
});
const getDefaultAuth = (): Auth => ({
    getUserId: () => null,
    check: () => false,
    login: () => false,
    logout: () => false,
    logoutAll: () => false,
});

const session: Session = getDefaultSession();
const auth: any = getDefaultAuth();
export default (
    httpData: HttpData,
    responseData: ResponseData,
): HttpContext => {
    const requestId = randomUUID();
    const requestLogger = logger.child({ requestId });

    return {
        requestId,
        logger: requestLogger,
        httpData,
        responseData,
        session,
        auth,
    };
};
