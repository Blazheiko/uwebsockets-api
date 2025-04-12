import redis from '#database/redis.js';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import { HttpContext, Session, SessionData, SessionInfo, WsContext } from '../types/types.js';
import sessionConfig from '#config/session.js';
import getRedisSessionStorage from '#vendor/utils/session/getRedisSessionStorage.js';
import logger from '#logger';

logger.info(`Session storage: ${sessionConfig.storage}`);
const { saveSession, getSession, updateSessionData, changeSessionData, destroySession } = getRedisSessionStorage();
const generateSessionId = () : string => crypto.randomUUID();

const createSessionInfo = async (data: SessionData = {}): Promise<SessionInfo> => {
    // const sessionId = generateSessionId();
    const session: SessionInfo = {
        id: generateSessionId(),
        data,
        createdAt: DateTime.now().toISO(),
        // expiresAt: DateTime.now().plus({ seconds: sessionConfig.age }).toISO(),
    };

    await saveSession(session);

    return session;
};

const createCookieValue = (sessionId: string, userId: string | undefined): string => (userId ? `${userId}.${sessionId}` : sessionId)

export const sessionHandler = async (context: HttpContext, accessToken: string | undefined, userId: string | undefined  ) => {

    const { responseData } = context;
    // let userId = undefined;
    let sessionId = undefined;
    let cookieUserId = undefined;
    if(!userId && accessToken){
        const decodedString = Buffer.from(accessToken, 'base64').toString('utf-8');
        const index = decodedString.indexOf('.');
        if(index === -1) sessionId = decodedString;
        else {
            cookieUserId = decodedString.substring(0, index);
            sessionId = decodedString.substring(index + 1);
        }
    }

    let sessionInfo = null;

    if(sessionId) sessionInfo = await getSession(sessionId, cookieUserId);

    if (!sessionInfo) sessionInfo = await createSessionInfo({ userId });

    const cookieValue = createCookieValue(sessionInfo.id, userId || cookieUserId);

    const value = Buffer.from( cookieValue ).toString('base64')

    // responseData.deleteCookie(sessionConfig.cookieName)
    responseData.setCookie(sessionConfig.cookieName, value,{
        path: sessionConfig.cookie.path,
        httpOnly: sessionConfig.cookie.httpOnly,
        secure: sessionConfig.cookie.secure,
        maxAge: sessionConfig.age,
    });

    context.session.sessionInfo = sessionInfo;
    context.session.updateSessionData = async ( newData: SessionData) => await updateSessionData( sessionInfo!.id, newData );
    context.session.changeSessionData = async ( newData: SessionData) => await changeSessionData( sessionInfo!.id, newData );
    context.session.destroySession = async () => await destroySession(sessionInfo!.id);

    context.auth.getUserId = () => (sessionInfo?.data?.userId);
    context.auth.check = () => Boolean(sessionInfo?.data?.userId);
    context.auth.login = async (user: any) => {
        const userId = sessionInfo?.data?.userId;
        const sessionId = sessionInfo?.id;
        if( sessionId) await destroySession( sessionId, (userId ? String(userId): undefined) )
        await sessionHandler( context, '', String(user.id))
        return true;
    };
    context.auth.logout = async () => {
        const userId = sessionInfo?.data?.userId;
        if(userId) {
            const sessionId = sessionInfo?.id;
            if(sessionId) await destroySession( sessionId, String(userId))
        }

        await sessionHandler( context, '', undefined)
        return true;
    };
    context.auth.logoutAll = async () => {
        const userId = sessionInfo?.data?.userId;
        if(!userId) return true;
        const sessionId = sessionInfo?.id;
        if(!sessionId) return false;
        await redis.del(`session:${userId}:*`);
        await sessionHandler( context, '', undefined)
        return true;
    };
}

export const wsSessionHandler = async (sessionId: string, userId: string): Promise<Session | null> => {

    let sessionInfo = await getSession(sessionId, userId);
    if (!sessionInfo || !sessionInfo.data || sessionInfo.data.userId != userId) return null;

    return  {
        sessionInfo: sessionInfo,
        updateSessionData: async ( newData: SessionData) => await updateSessionData( sessionInfo!.id, newData ),
        changeSessionData: async ( newData: SessionData) => await changeSessionData( sessionInfo!.id, newData ),
        destroySession: async () => await destroySession(sessionInfo!.id),
    }
}

// export default { sessionHandler, wsSessionHandler };