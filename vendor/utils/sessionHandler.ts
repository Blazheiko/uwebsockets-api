import redis from '#database/redis.js';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import { HttpContext, HttpData, ResponseData, Session, SessionData, SessionInfo } from '../types/types.js';
import sessionConfig from '#config/session.js';
import logger from '#logger';


const generateSessionId = () : string => crypto.randomUUID();

const saveSession = async (sessionInfo: SessionInfo): Promise<void> => {
    const userId = sessionInfo?.data?.userId ? sessionInfo.data.userId: 'guest';
    await redis.setex(
        `session:${userId}:${sessionInfo.id}`,
        sessionConfig.age,
        JSON.stringify(sessionInfo)
    );
};

const getSession = async (sessionId: string | undefined, userId = 'guest' ): Promise<SessionInfo | null> => {
    if (!sessionId) return null;
    const sessionJson: string | null = await redis.getex(`session:${userId}:${sessionId}`, 'EX', sessionConfig.age);
    if (!sessionJson) return null;
    try {
        return JSON.parse(sessionJson);
    }catch (e) {
        logger.error(e);
    }
    return null;
};

const updateSessionData = async (sessionId: string, newData: SessionData, userId='guest'): Promise<SessionInfo | null> => {
    const session = await getSession(sessionId , userId );
    if (!session) return null;
    const updatedSession: SessionInfo = {
        ...session,
        data: { ...session.data, ...newData },
        updatedAt: DateTime.now().toISO()
    };
    await saveSession(updatedSession);
    return updatedSession;
};

const  changeSessionData = async (sessionId: string, newData: SessionData, userId = 'guest'): Promise<SessionInfo | null> => {
    const session = await getSession(sessionId, userId);
    if (!session) return null;
    const updatedSession: SessionInfo = {
        ...session,
        data: newData,
        updatedAt: DateTime.now().toISO()
    };
    await saveSession(updatedSession);
    return updatedSession;
};

const destroySession = async (sessionId: string, userId = 'guest' ): Promise<void> => {
    await redis.del(`session:${userId}:${sessionId}`);
}

const createSessionInfo = async (data: SessionData = {}): Promise<SessionInfo> => {
    const sessionId = generateSessionId();
    const session: SessionInfo = {
        id: sessionId,
        data,
        createdAt: DateTime.now().toISO(),
        expiresAt: DateTime.now().plus({ seconds: sessionConfig.age }).toISO(),
    };

    await saveSession(session);

    return session;
};

const sessionHandler = async ( context: HttpContext, accessToken: string | undefined, userId: string | undefined  ) => {

    const { responseData } = context;
    // let userId = undefined;
    let sessionId = undefined;
    if(accessToken){
        const decodedString = Buffer.from(accessToken, 'base64').toString('utf-8');
        const index = decodedString.indexOf('.');
        if(index === -1) sessionId = decodedString;
        else {
            userId = decodedString.substring(0, index);
            sessionId = decodedString.substring(index + 1);
        }
    }

    let sessionInfo = null;

    if(sessionId) sessionInfo = await getSession(sessionId, userId);

    if (!sessionInfo) sessionInfo = await createSessionInfo({ userId });

    sessionId = userId ? `${userId}.${sessionInfo.id}` : sessionInfo.id;

    const value = Buffer.from( sessionId ).toString('base64')

    responseData.setCookie(sessionConfig.cookieName, value,{
        path: sessionConfig.cookie.path,
        httpOnly: sessionConfig.cookie.httpOnly,
        secure: sessionConfig.cookie.secure,
        maxAge: sessionConfig.age,
    });

    context.session = {
        sessionInfo,
        updateSessionData: async ( newData: SessionData) => await updateSessionData( sessionInfo!.id, newData ),
        changeSessionData: async ( newData: SessionData) => await changeSessionData( sessionInfo!.id, newData ),
        destroySession: async () => await destroySession(sessionInfo!.id),
    }
};

export default sessionHandler;