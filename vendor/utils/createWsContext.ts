import {
    Auth,
    Session,
    WsContext,
    WsData,
    WsResponseData
} from '../types/types.js';

import logger from '#logger';
import { randomUUID } from 'crypto';


const getDefaultSession = (): Session => ({
    sessionInfo: null,
    updateSessionData: () => null,
    changeSessionData: () => null,
    destroySession: () => 0,
})
const getDefaultAuth = (): Auth => ({
    getUserId: () => null,
    check: () => false,
    login: () => false,
    logout: () => false,
    logoutAll: () => false,
});

const session: Session =  getDefaultSession();
const auth: any = getDefaultAuth();
export default ( wsData: WsData, responseData: WsResponseData ): WsContext => {
    const requestId = randomUUID();
    const requestLogger = logger.child({ requestId });

    return {
        requestId,
        logger: requestLogger,
        wsData,
        responseData ,
        session,
        auth
    }

}