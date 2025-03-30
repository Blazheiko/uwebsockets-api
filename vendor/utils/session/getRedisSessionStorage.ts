import { SessionData, SessionInfo } from '../../types/types.js';
import { DateTime } from 'luxon';
import redis from '#database/redis.js';
import logger from '#logger';
import sessionConfig from '#config/session.js';

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

export default () => ({ saveSession, getSession, updateSessionData, changeSessionData, destroySession });
