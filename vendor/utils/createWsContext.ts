import {
    Session,
    WsContext,
    WsData,
    WsResponseData
} from '../types/types.js';

import logger from '#logger';
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
export default async ( wsData: WsData, responseData: WsResponseData, session: Session ): Promise<WsContext> => {
    const requestId = randomUUID();
    const requestLogger = logger.child({ requestId });
    // const userData = wsData.middlewareData.userData;
    // let session: Session | null = null;
    // if (userData && userData.sessionId && userData.userId) {
    //     session =  await getCurrentSession(userData.sessionId , userData.userId);
    // }

    return {
        requestId,
        logger: requestLogger,
        wsData,
        responseData ,
        session,
        auth: null
    }

}