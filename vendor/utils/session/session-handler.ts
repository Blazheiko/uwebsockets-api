import redis from '#database/redis.js';
import { DateTime } from 'luxon';
import crypto from 'node:crypto';

import {
    HttpContext,
    Session,
    SessionData,
    SessionInfo,
    WsContext,
} from '../../types/types.js';
import sessionConfig from '#config/session.js';
import {
    saveSession,
    getSession,
    updateSessionData,
    changeSessionData,
    destroySession,
    destroyAllSessions,
} from '#vendor/utils/session/redis-session-storage.js';
import logger from '#logger';
import {
    createSignedToken,
    verifySignedToken,
} from '#vendor/utils/session/token-handler.js';
import { normalizeUserId } from '#vendor/utils/normalize-user-id.js';

logger.info(`Session storage: ${sessionConfig.storage}`);

const generateSessionId = (): string => crypto.randomUUID();



/**
 * Sanitizes Redis keys for protection against injections
 * Allowed characters only: letters, digits, hyphen, underscore, colon
 */
// const sanitizeRedisKey = (key: string): string => {
//     if (!/^[a-zA-Z0-9:_*-]+$/.test(key)) {
//         logger.error(`Invalid Redis key format: ${key}`);
//         throw new Error(`Invalid Redis key format`);
//     }
//     return key;
// };

const createSessionInfo = async (
    data: SessionData = {},
): Promise<SessionInfo> => {
    const session: SessionInfo = {
        id: generateSessionId(),
        data,
        createdAt: DateTime.now().toISO(),
        // expiresAt: DateTime.now().plus({ seconds: sessionConfig.age }).toISO(),
    };

    await saveSession(session);

    return session;
};

const createCookieValue = (
    sessionId: string,
    userId: string | undefined,
): string => (userId ? `${userId}.${sessionId}` : `0.${sessionId}`);

const updateContextWithNewSession = (
    context: HttpContext,
    newSessionInfo: SessionInfo,
    userId: string | undefined,
    responseData: any,
) => {
    const cookieValue = createCookieValue(newSessionInfo.id, userId);
    const signedToken = createSignedToken(cookieValue);

    responseData.setCookie(sessionConfig.cookieName, signedToken, {
        path: sessionConfig.cookie.path,
        httpOnly: sessionConfig.cookie.httpOnly,
        secure: sessionConfig.cookie.secure,
        maxAge: sessionConfig.age,
        sameSite: sessionConfig.cookie.sameSite,
    });

    context.session.sessionInfo = newSessionInfo;

    return newSessionInfo;
};

export const sessionHandler = async (
    context: HttpContext,
    accessToken: string | undefined,
    userId: string | bigint | number | undefined,
) => {
    const { responseData } = context;

    // Normalize userId at the beginning for security
    const normalizedUserId = userId ? normalizeUserId(userId) : undefined;

    let sessionId = undefined;
    let cookieUserId = undefined;

    if (!normalizedUserId && accessToken) {
        const verifiedData = verifySignedToken(accessToken);

        if (verifiedData) {
            ({ cookieUserId, sessionId } = verifiedData);

            // Validate cookieUserId from token
            try {
                cookieUserId = normalizeUserId(cookieUserId);
            } catch (error) {
                logger.error({
                    cookieUserId,
                    ip: context.httpData.ip,
                    userAgent: context.httpData.headers.get('user-agent'),
                }, 'Invalid cookieUserId from token');
                cookieUserId = undefined;
                sessionId = undefined;
            }
        } else {
            logger.warn({
                ip: context.httpData.ip,
                userAgent: context.httpData.headers.get('user-agent'),
            }, 'Invalid access token');
        }
    }

    let sessionInfo: SessionInfo | null = null;

    if (sessionId) {
        sessionInfo = await getSession(sessionId, cookieUserId || '0');
    }

    if (!sessionInfo) {
        sessionInfo = await createSessionInfo({
            userId: normalizedUserId || undefined,
        });
    }

    const finalUserId = normalizedUserId || cookieUserId;
    const cookieValue = createCookieValue(sessionInfo.id, finalUserId);

    const signedToken = createSignedToken(cookieValue);

    // responseData.deleteCookie(sessionConfig.cookieName)
    responseData.setCookie(sessionConfig.cookieName, signedToken, {
        path: sessionConfig.cookie.path,
        httpOnly: sessionConfig.cookie.httpOnly,
        secure: sessionConfig.cookie.secure,
        maxAge: sessionConfig.age,
        sameSite: sessionConfig.cookie.sameSite,
    });

    const contextUserId = finalUserId || '0';

    context.session.sessionInfo = sessionInfo;
    context.session.updateSessionData = async (newData: SessionData) =>
        await updateSessionData(sessionInfo!.id, newData, contextUserId);
    context.session.changeSessionData = async (newData: SessionData) =>
        await changeSessionData(sessionInfo!.id, newData, contextUserId);
    context.session.destroySession = async () =>
        await destroySession(sessionInfo!.id, contextUserId);

    context.auth.getUserId = () => sessionInfo?.data?.userId;
    context.auth.check = () => Boolean(sessionInfo?.data?.userId);
    context.auth.login = async (user: any) => {
        try {
            const oldSessionId = sessionInfo?.id;
            const oldUserId = sessionInfo?.data?.userId;

            // Destroy old session with normalized userId
            if (oldSessionId) {
                const normalizedOldUserId = normalizeUserId(oldUserId);
                await destroySession(oldSessionId, normalizedOldUserId);
            }

            // Normalize new userId for security
            const normalizedNewUserId = normalizeUserId(user.id);
            const newSessionInfo = await createSessionInfo({
                userId: normalizedNewUserId,
            });

            sessionInfo = updateContextWithNewSession(
                context,
                newSessionInfo,
                normalizedNewUserId,
                responseData,
            );

            logger.info(`User logged in`, {
                userId: normalizedNewUserId,
                sessionId: newSessionInfo.id,
            });

            return true;
        } catch (err) {
            logger.error({ err },'Login error:');
            throw err;
        }
    };

    context.auth.logout = async () => {
        try {
            const userId = sessionInfo?.data?.userId;
            let sessionId = undefined;
            if (userId) {
                sessionId = sessionInfo?.id;
                if (sessionId) {
                    const normalizedUserId = normalizeUserId(userId);
                    await destroySession(sessionId, normalizedUserId);

                    logger.info(`User logged out`, {
                        userId: normalizedUserId,
                        sessionId,
                    });
                }
            }

            const newSessionInfo = await createSessionInfo({});

            sessionInfo = updateContextWithNewSession(
                context,
                newSessionInfo,
                undefined,
                responseData,
            );

            return true;
        } catch (err) {
            logger.error(
                { err, userId, sessionId },
                'Logout error'
            );
            throw err;
        }
    };

    context.auth.logoutAll = async (): Promise<number> => {
        try {
            let deletedCount = 0;
            const userId = sessionInfo?.data?.userId;
            let sessionId = undefined;
            if (!userId || userId === '0') return 0;

            sessionId = sessionInfo?.id;
            if (sessionId) {
                
                deletedCount = await destroyAllSessions(userId);

                logger.info(`User ${userId} logged out all sessions ${deletedCount}`);
            }


            const newSessionInfo = await createSessionInfo({});

            sessionInfo = updateContextWithNewSession(
                context,
                newSessionInfo,
                undefined,
                responseData,
            );

            return deletedCount;
        } catch (err) {
            logger.error(
                { err, userId, sessionId },
                'Logout error'
            );
            throw err;
        }
    };
};

export const wsSessionHandler = async (
    sessionId: string,
    userId: string | bigint | number,
): Promise<Session | null> => {
    try {
        // Normalize userId for protection against type coercion attacks
        const normalizedUserId = normalizeUserId(userId);

        let sessionInfo = await getSession(sessionId, normalizedUserId);

        if (!sessionInfo) {
            logger.warn({
                sessionId,
                userId: normalizedUserId,
            }, 'Session not found');
            return null;
        }

        // Normalize userId from session and strictly compare
        const sessionUserId = normalizeUserId(sessionInfo.data?.userId);

        // CRITICAL: use strict comparison !== for protection against type coercion
        if (sessionUserId !== normalizedUserId) {
            logger.error({
                sessionId,
                expectedUserId: normalizedUserId,
                expectedType: typeof normalizedUserId,
                actualUserId: sessionUserId,
                actualType: typeof sessionUserId,
                rawSessionUserId: sessionInfo.data?.userId,
            },
                `Session userId mismatch - potential security breach`
            );
            return null;
        }

        return {
            sessionInfo: sessionInfo,
            updateSessionData: async (newData: SessionData) =>
                await updateSessionData(
                    sessionInfo!.id,
                    newData,
                    normalizedUserId,
                ),
            changeSessionData: async (newData: SessionData) =>
                await changeSessionData(
                    sessionInfo!.id,
                    newData,
                    normalizedUserId,
                ),
            destroySession: async () =>
                await destroySession(sessionInfo!.id, normalizedUserId),
        };
    } catch (err) {
        logger.error(
            { err, sessionId, userId },
            'wsSessionHandler error'
        );
        return null;
    }
};

// export default { sessionHandler, wsSessionHandler };
