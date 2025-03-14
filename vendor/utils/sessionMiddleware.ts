import redis from '#database/redis.js';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import { HttpData, ResponseData, Session, SessionData } from '../types/types.js';
import sessionConfig from '#config/session.js';
import logger from '../../logger.js';


const generateSessionId = () => Buffer.from( crypto.randomUUID() ).toString('base64');

const saveSession = async (session: Session): Promise<void> => {
    await redis.setex(
        `session:${session.id}`,
        sessionConfig.age,
        JSON.stringify(session)
    );
};

const getSession = async (sessionId: string | undefined): Promise<Session | null> => {
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

const updateSessionData = async (sessionId: string, newData: SessionData): Promise<Session | null> => {
    const session = await getSession(sessionId);
    if (!session) return null;
    const updatedSession: Session = {
        ...session,
        data: { ...session.data, ...newData },
        updatedAt: DateTime.now().toISO()
    };
    await saveSession(updatedSession);
    return updatedSession;
};

const  changeSessionData = async (sessionId: string, newData: SessionData): Promise<Session | null> => {
    const session = await getSession(sessionId);
    if (!session) return null;
    const updatedSession: Session = {
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

const createSession = async (data: SessionData = {}): Promise<Session> => {
    const sessionId = generateSessionId();
    const session: Session = {
        id: sessionId,
        data,
        createdAt: DateTime.now().toISO(),
        expiresAt: DateTime.now().plus({ seconds: sessionConfig.age }).toISO(),
    };

    await saveSession(session);

    return session;
};

const sessionMiddleware = async ( httpData: HttpData, responseData: ResponseData, next: Function) => {
    logger.info('sessionMiddleware');
    const cookies = httpData.cookies;
    const sessionId = cookies.get(sessionConfig.cookieName);
    let session = null;
    logger.info(`sessionId: ${sessionId}`);

    if(sessionId) session = await getSession(sessionId);

    if (!session) {
        session = await createSession();
        responseData.setCookie(sessionConfig.cookieName, session.id,{
            path: sessionConfig.cookie.path,
            httpOnly: sessionConfig.cookie.httpOnly,
            secure: sessionConfig.cookie.secure,
            maxAge: sessionConfig.age,
        });
    }

    httpData.session.sessionInfo = session;
    httpData.session.updateSessionData = async ( newData: SessionData) => {
        httpData.session.sessionInfo = await updateSessionData( httpData.session!.sessionInfo!.id, newData);
    };;
    httpData.session.changeSessionData = async ( newData: SessionData) => {
        httpData.session.sessionInfo = await changeSessionData( httpData.session!.sessionInfo!.id, newData);
    };
    httpData.session.destroySession = async () => {
        await destroySession(session!.id);
        responseData.setCookie(sessionConfig.cookieName, session.id,{
            path: sessionConfig.cookie.path,
            httpOnly: sessionConfig.cookie.httpOnly,
            secure: sessionConfig.cookie.secure,
            maxAge: 0,
        });
    };
};


export default sessionMiddleware;


