import redis from '#database/redis.js';
import logger from '#logger';
import type { SessionInfo, SessionData } from '#vendor/types/types.js';

const WS_TOKEN_TTL = 120;

const verifyUpgradeToken = async (
    token: string,
): Promise<{ sessionId: string; userId: string; userToken: string } | null> => {
    if (token === '') return null;
    try {
        const tokenData = await redis.get(`auth:ws:${token}`);
        if (tokenData === null) {
            logger.warn({ token }, 'verifyUpgradeToken: token not found in Redis');
            return null;
        }

        const parsed = JSON.parse(tokenData) as {
            sessionId: string | undefined;
            userId: string | undefined;
            userToken: string | undefined;
        };
        const { sessionId, userId, userToken } = parsed;

        if (
            sessionId === undefined ||
            userId === undefined ||
            userToken === undefined ||
            userId === '' ||
            userToken === '' ||
            sessionId === ''
        ) {
            logger.warn({ sessionId, userId }, 'verifyUpgradeToken: invalid token data');
            return null;
        }

        const sessionKey = `session:${userToken}:${sessionId}`;
        const sessionData = await redis.get(sessionKey);
        if (sessionData === null) {
            logger.warn({ sessionKey }, 'verifyUpgradeToken: session not found in Redis');
            return null;
        }

        const sessionInfo = JSON.parse(sessionData) as SessionInfo;
        const data: SessionData = sessionInfo.data;
        if ('userId' in data && String(data.userId) === userId) {
            return { sessionId, userId, userToken };
        }

        logger.warn(
            { sessionUserId: data.userId, tokenUserId: userId },
            'verifyUpgradeToken: userId mismatch between session and token',
        );
        return null;
    } catch (error) {
        logger.error({ err: error }, 'verifyUpgradeToken error');
        return null;
    }
};

const refreshToken = async (token: string): Promise<void> => {
    if (token === '') return;
    await redis.expire(`auth:ws:${token}`, WS_TOKEN_TTL);
};

const revokeToken = async (token: string): Promise<void> => {
    if (token === '') return;
    await redis.del(`auth:ws:${token}`);
};

export const wsSessionAuth = {
    verifyUpgradeToken,
    refreshToken,
    revokeToken,
};
