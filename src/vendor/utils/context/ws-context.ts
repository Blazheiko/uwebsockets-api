import type {
    Session,
    WsContext,
    WsData,
    WsResponseData,
} from '#vendor/types/types.js';

import logger from '#vendor/utils/logger.js';
import { randomUUID } from 'crypto';
// import getRedisSessionStorage from '#vendor/utils/session/getRedisSessionStorage.js';

// const { saveSession, getSession, updateSessionData, changeSessionData, destroySession } = getRedisSessionStorage();
// const getCurrentSession = async (sessionId: string , userId: number): Promise<Session> => ({
//     sessionInfo: await getSession(sessionId , String(userId)),
//     updateSessionData: updateSessionData,
//     changeSessionData: changeSessionData,
//     destroySession: destroySession,
// })
// const getDefaultAuth = (): Auth => ({
//     getUserId: () => null,
//     check: () => false,
//     login: () => false,
//     logout: () => false,
//     logoutAll: () => false,
// });

// const auth: any = getDefaultAuth();
export default (
    wsData: WsData,
    responseData: WsResponseData,
    _session: Session | null,
): WsContext => {
    const requestId = randomUUID();
    const requestLogger = logger.child({ requestId }) as unknown as WsContext["logger"];
    // const userData = wsData.middlewareData.userData;
    // let session: Session | null = null;
    // if (userData && userData.sessionId && userData.userId) {
    //     session =  await getCurrentSession(userData.sessionId , userData.userId);
    // }

    return {
        requestId,
        logger: requestLogger,
        ws: wsData.ws,
        wsData,
        validator: undefined,
        responseData,
        session: null,
        auth: null,
    };
};
