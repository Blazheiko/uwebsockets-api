import { SessionData, SessionInfo } from '../../types/types.js';
import { DateTime } from 'luxon';
import redis from '#database/redis.js';
import logger from '#logger';
import sessionConfig from '#config/session.js';

/**
 * Normalizes userId to string format for protection against type coercion attacks
 * Duplicated here to avoid circular dependencies
 */
const normalizeUserId = (
    userId: string | bigint | number | undefined | null,
): string => {
    if (userId === undefined || userId === null) return '0';

    if (typeof userId === 'bigint' || typeof userId === 'number') {
        return userId.toString();
    }

    if (typeof userId === 'string') {
        const trimmed = userId.trim();
        if (trimmed === '') return '0';

        if (!/^\d+$/.test(trimmed)) {
            logger.error(
                `Invalid userId format in redis-session-storage: ${userId}`,
            );
            throw new Error(
                `Invalid userId format: contains non-digit characters`,
            );
        }

        return trimmed;
    }

    logger.error(
        `Invalid userId type in redis-session-storage: ${typeof userId}`,
    );
    throw new Error(`Invalid userId type: ${typeof userId}`);
};

/**
 * Sanitizes Redis keys for protection against injections
 */
const sanitizeRedisKey = (key: string): string => {
    if (!/^[a-zA-Z0-9:_-]+$/.test(key)) {
        logger.error(`Invalid Redis key format: ${key}`);
        throw new Error(`Invalid Redis key format`);
    }
    return key;
};

export const saveSession = async (sessionInfo: SessionInfo): Promise<void> => {
    const userId = normalizeUserId(sessionInfo?.data?.userId);
    const redisKey = sanitizeRedisKey(`session:${userId}:${sessionInfo.id}`);

    await redis.setex(
        redisKey,
        sessionConfig.age,
        JSON.stringify(sessionInfo, (_, v) =>
            typeof v === 'bigint' ? v.toString() : v,
        ),
    );
};

export const getSession = async (
    sessionId: string | undefined,
    userId: string | bigint | number,
): Promise<SessionInfo | null> => {
    if (!sessionId) return null;

    const normalizedUserId = normalizeUserId(userId);
    const redisKey = sanitizeRedisKey(
        `session:${normalizedUserId}:${sessionId}`,
    );

    const sessionJson: string | null = await redis.getex(
        redisKey,
        'EX',
        sessionConfig.age,
    );

    if (!sessionJson) return null;

    try {
        return JSON.parse(sessionJson);
    } catch (e) {
        logger.error('Failed to parse session JSON:', e);
    }
    return null;
};

export const updateSessionData = async (
    sessionId: string,
    newData: SessionData,
    userId: string | bigint | number,
): Promise<SessionInfo | null> => {
    const normalizedUserId = normalizeUserId(userId);
    const session = await getSession(sessionId, normalizedUserId);
    if (!session) return null;

    const updatedSession: SessionInfo = {
        ...session,
        data: { ...session.data, ...newData },
        updatedAt: DateTime.now().toISO(),
    };

    await saveSession(updatedSession);
    return updatedSession;
};

export const changeSessionData = async (
    sessionId: string,
    newData: SessionData,
    userId: string | bigint | number,
): Promise<SessionInfo | null> => {
    const normalizedUserId = normalizeUserId(userId);
    const session = await getSession(sessionId, normalizedUserId);
    if (!session) return null;

    const updatedSession: SessionInfo = {
        ...session,
        data: newData,
        updatedAt: DateTime.now().toISO(),
    };

    await saveSession(updatedSession);
    return updatedSession;
};

export const destroySession = async (
    sessionId: string,
    userId: string | bigint | number,
): Promise<void> => {
    const normalizedUserId = normalizeUserId(userId);
    const redisKey = sanitizeRedisKey(
        `session:${normalizedUserId}:${sessionId}`,
    );
    await redis.del(redisKey);
};

// export default () => ({ saveSession, getSession, updateSessionData, changeSessionData, destroySession });
