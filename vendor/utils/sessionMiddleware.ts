import redis from '#database/redis.js';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import { HttpContext, HttpData, ResponseData, Session, SessionData, SessionInfo } from '../types/types.js';
import sessionConfig from '#config/session.js';
import logger from '../../logger.js';


const generateSessionId = () => Buffer.from( crypto.randomUUID() ).toString('base64');

const saveSession = async (session: SessionInfo): Promise<void> => {
    await redis.setex(
        `session:${session.id}`,
        sessionConfig.age,
        JSON.stringify(session)
    );
};

const getSession = async (sessionId: string | undefined): Promise<SessionInfo | null> => {
    if (!sessionId) return null;
    const sessionJson: string | null = await redis.get(`session:${sessionId}`);
    if (!sessionJson) return null;
    try {
        return JSON.parse(sessionJson);
    }catch (e) {
        logger.error(e);
    }
    return null;
};

const updateSessionData = async (sessionId: string, newData: SessionData): Promise<SessionInfo | null> => {
    const session = await getSession(sessionId);
    if (!session) return null;
    const updatedSession: SessionInfo = {
        ...session,
        data: { ...session.data, ...newData },
        updatedAt: DateTime.now().toISO()
    };
    await saveSession(updatedSession);
    return updatedSession;
};

const  changeSessionData = async (sessionId: string, newData: SessionData): Promise<SessionInfo | null> => {
    const session = await getSession(sessionId);
    if (!session) return null;
    const updatedSession: SessionInfo = {
        ...session,
        data: newData,
        updatedAt: DateTime.now().toISO()
    };
    await saveSession(updatedSession);
    return updatedSession;
};

const destroySession = async (sessionId: string): Promise<void> => {
    await redis.del(`session:${sessionId}`);
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

const sessionMiddleware = async ( context: HttpContext, next: Function) => {
    logger.info('sessionMiddleware');
    const { httpData , responseData } = context;
    const cookies = httpData.cookies;
    const sessionId = cookies.get(sessionConfig.cookieName);
    let sessionInfo = null;
    logger.info(`sessionId: ${sessionId}`);

    if(sessionId) sessionInfo = await getSession(sessionId);

    if (!sessionInfo) {
        sessionInfo = await createSessionInfo();
        responseData.setCookie(sessionConfig.cookieName, sessionInfo.id,{
            path: sessionConfig.cookie.path,
            httpOnly: sessionConfig.cookie.httpOnly,
            secure: sessionConfig.cookie.secure,
            maxAge: sessionConfig.age,
        });
    }
    const session : Session = {
        sessionInfo,
        updateSessionData: async ( newData: SessionData) => await updateSessionData( sessionInfo!.id, newData ),
        changeSessionData: async ( newData: SessionData) => await changeSessionData( sessionInfo!.id, newData ),
        destroySession: async () => await destroySession(sessionInfo!.id),
    }

    // httpData.session.sessionInfo = session;
    // httpData.session.updateSessionData = async ( newData: SessionData) => {
    //     httpData.session.sessionInfo = await updateSessionData( httpData.session!.sessionInfo!.id, newData);
    // };
    // httpData.session.changeSessionData = async ( newData: SessionData) => {
    //     httpData.session.sessionInfo = await changeSessionData( httpData.session!.sessionInfo!.id, newData);
    // };
    // httpData.session.destroySession = async () => {
    //     await destroySession(session!.id);
    //     responseData.setCookie(sessionConfig.cookieName, session.id,{
    //         path: sessionConfig.cookie.path,
    //         httpOnly: sessionConfig.cookie.httpOnly,
    //         secure: sessionConfig.cookie.secure,
    //         maxAge: 0,
    //     });
    // };
};


export default sessionMiddleware;


