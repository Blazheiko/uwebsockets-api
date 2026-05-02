import type { SessionData, SessionInfo } from '#vendor/types/types.js';
// import { DateTime } from 'luxon';
import redis from '#database/redis.js';
import logger from '#vendor/utils/logger.js';
import sessionConfig from '#config/session.js';
import redisConfig from '#config/redis.js';

/**
 * Normalizes userId to string format for protection against type coercion attacks
 * Duplicated here to avoid circular dependencies
 */
// const normalizeUserId = (
//     userId: string | bigint | number | undefined | null,
// ): string => {
//     if (userId === undefined || userId === null) return '0';

//     if (typeof userId === 'bigint' || typeof userId === 'number') {
//         return userId.toString();
//     }

//     if (typeof userId === 'string') {
//         const trimmed = userId.trim();
//         if (trimmed === '') return '0';

//         if (!/^\d+$/.test(trimmed)) {
//             logger.error(
//                 `Invalid userId format in redis-session-storage: ${userId}`,
//             );
//             throw new Error(
//                 `Invalid userId format: contains non-digit characters`,
//             );
//         }

//         return trimmed;
//     }

//     logger.error(
//         `Invalid userId type in redis-session-storage: ${typeof userId}`,
//     );
//     throw new Error(`Invalid userId type: ${typeof userId}`);
// };

/**
 * Sanitizes Redis keys for protection against injections
 */
const MAX_KEY_LENGTH = 86;
export const sanitizeRedisKey = (key: string | undefined | null ): string => {
    if (
        key === undefined ||
        key === null ||
        key === '' ||
        key.length > MAX_KEY_LENGTH ||
        !/^[a-zA-Z0-9:_*-]+$/.test(key)
    ) {
        logger.error({ key }, `Invalid Redis key format`);
        throw new Error(`Invalid Redis key format`);
    }
    return key;
};

export const saveSession = async (sessionInfo: SessionInfo): Promise<void> => {
    // Authenticated sessions use the user's nanoid token; anonymous sessions use shared prefix
    const userToken = typeof sessionInfo.data.userToken === 'string' ? sessionInfo.data.userToken : 'anon_session';
    const redisKey = sanitizeRedisKey(`session:${userToken}:${sessionInfo.id}`);

    await redis.setex(
        redisKey,
        sessionConfig.age,
        JSON.stringify(sessionInfo, (_, v: unknown) =>
            typeof v === 'bigint' ? v.toString() : v,
        ),
    );
};

export const getSession = async (
    sessionId: string | undefined,
    userToken: string,
): Promise<SessionInfo | null> => {
    if (sessionId === undefined) return null;

    const redisKey = sanitizeRedisKey(`session:${userToken}:${sessionId}`);

    const sessionJson = await redis.getex(
        redisKey,
        'EX',
        sessionConfig.age,
    );

    if (sessionJson === null) return null;

    try {
        return JSON.parse(sessionJson) as SessionInfo;
    } catch (e) {
        logger.error({ err: e }, 'Failed to parse session JSON:');
    }
    return null;
};

export const updateSessionData = async (
    sessionId: string | undefined,
    newData: SessionData,
    userToken: string,
): Promise<SessionInfo | null> => {
    if (sessionId === undefined) return null;
    const session = await getSession(sessionId, userToken);
    if (session === null) return null;

    const updatedSession: SessionInfo = {
        ...session,
        data: { ...session.data, ...newData },
        updatedAt: new Date().toISOString(),
    };

    await saveSession(updatedSession);
    return updatedSession;
};

export const changeSessionData = async (
    sessionId: string | undefined,
    newData: SessionData,
    userToken: string,
): Promise<SessionInfo | null> => {
    if (sessionId === undefined) return null;
    const session = await getSession(sessionId, userToken);
    if (session === null) return null;

    const updatedSession: SessionInfo = {
        ...session,
        data: newData,
        updatedAt: new Date().toISOString(),
    };

    await saveSession(updatedSession);
    return updatedSession;
};

export const destroySession = async (
    sessionId: string | undefined,
    userToken: string,
): Promise<void> => {
    if (sessionId === undefined) return;
    const redisKey = sanitizeRedisKey(`session:${userToken}:${sessionId}`);
    await redis.del(redisKey);
};

export const destroyAllSessions = async (
    userToken: string,
): Promise<number> => {
    const prefix = redisConfig.keyPrefix;
    const pattern = sanitizeRedisKey(`${prefix}session:${userToken}:*`);
    logger.info(
        `Destroying all sessions for userToken ${userToken} with pattern ${pattern}`,
    );
    // Use SCAN instead of KEYS for DoS protection
    // SCAN doesn't block Redis and is safe for production
    let cursor = '0';
    let deletedCount = 0;

    do {
        const [nextCursor, foundKeys] = await redis.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100,
        );
        cursor = nextCursor;
        if (foundKeys.length > 0) {
            // Remove the prefix from keys since redis.del will add it automatically
            const keysWithoutPrefix = removePrefixFromKeys(foundKeys, prefix);
            await redis.del(...keysWithoutPrefix);
            deletedCount += foundKeys.length;
        }
    } while (cursor !== '0');

    logger.info(
        `Deleted ${String(deletedCount)} sessions for userToken ${userToken}`,
    );

    return deletedCount;
};

const removePrefixFromKeys = (keys: string[], prefix: string): string[] => {
    return keys.map((key) =>
        key.startsWith(prefix) ? key.substring(prefix.length) : key,
    );
};

// export default () => ({ saveSession, getSession, updateSessionData, changeSessionData, destroySession });
