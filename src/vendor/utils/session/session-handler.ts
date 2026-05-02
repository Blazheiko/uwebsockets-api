// import redis from '#database/redis.js';
// import { DateTime } from "luxon";
import crypto from "node:crypto";

import type {
  HttpContext,
  Session,
  SessionData,
  SessionInfo,
  // WsContext,
} from "#vendor/types/types.js";
import sessionConfig from "#config/session.js";
import {
  saveSession,
  getSession,
  updateSessionData,
  changeSessionData,
  destroySession,
  destroyAllSessions,
} from "#vendor/utils/session/redis-session-storage.js";
import logger from "#vendor/utils/logger.js";
import {
  createSignedToken,
  verifySignedToken,
} from "#vendor/utils/session/token-handler.js";
import type { ResponseData } from "#vendor/types/types.js";

const isValidUserToken = (token: unknown): token is string =>
  typeof token === 'string' && /^[a-zA-Z0-9_-]{10,}$/.test(token);

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
  data: SessionData = {}
): Promise<SessionInfo> => {
  const session: SessionInfo = {
    id: generateSessionId(),
    data,
    createdAt: new Date().toISOString(),
    // expiresAt: DateTime.now().plus({ seconds: sessionConfig.age }).toISO(),
  };

  await saveSession(session);

  return session;
};

const ANON_TOKEN = 'anon_session';

const createCookieValue = (
  sessionId: string,
  userToken: string | undefined
): string =>
  userToken !== undefined ? `${userToken}.${sessionId}` : `${ANON_TOKEN}.${sessionId}`;

const updateContextWithNewSession = (
  context: HttpContext,
  newSessionInfo: SessionInfo,
  userToken: string | undefined,
  responseData: ResponseData
): SessionInfo => {
  const cookieValue = createCookieValue(newSessionInfo.id, userToken);
  const signedToken = createSignedToken(cookieValue);

  responseData.setCookie(sessionConfig.cookieName, signedToken, {
    path: sessionConfig.cookie.path,
    httpOnly: sessionConfig.cookie.httpOnly,
    secure: sessionConfig.cookie.secure,
    maxAge: sessionConfig.age,
    sameSite: sessionConfig.cookie.sameSite,
    expires: new Date(Date.now() + sessionConfig.age * 1000),
  });

  context.session.sessionInfo = newSessionInfo;

  return newSessionInfo;
};

export const sessionHandler = async (
  context: HttpContext,
  accessToken: string | undefined,
  _userId: string | undefined
): Promise<void> => {
  const { responseData } = context;

  let sessionId: string | undefined;
  let cookieUserToken: string | undefined;

  if (accessToken !== undefined) {
    const verifiedData = verifySignedToken(accessToken);

    if (verifiedData !== null) {
      ({ cookieUserToken, sessionId } = verifiedData);

      if (!isValidUserToken(cookieUserToken)) {
        logger.warn(
          {
            ip: context.httpData.ip,
            userAgent: context.httpData.headers.get("user-agent"),
          },
          "Invalid cookieUserToken format in token"
        );
        cookieUserToken = undefined;
        sessionId = undefined;
      }
    } else {
      logger.warn(
        {
          ip: context.httpData.ip,
          userAgent: context.httpData.headers.get("user-agent"),
        },
        "Invalid access token"
      );
    }
  }

  let sessionInfo: SessionInfo | null = null;

  if (sessionId !== undefined && cookieUserToken !== undefined) {
    sessionInfo = await getSession(sessionId, cookieUserToken);
  }

  // Anonymous session — no userToken, stored with placeholder key
  sessionInfo ??= await createSessionInfo({});

  const sessionUserToken = cookieUserToken ?? (typeof sessionInfo.data.userToken === 'string' ? sessionInfo.data.userToken : undefined);
  const cookieValue = createCookieValue(sessionInfo.id, sessionUserToken);
  const signedToken = createSignedToken(cookieValue);

  responseData.setCookie(sessionConfig.cookieName, signedToken, {
    path: sessionConfig.cookie.path,
    httpOnly: sessionConfig.cookie.httpOnly,
    secure: sessionConfig.cookie.secure,
    maxAge: sessionConfig.age,
    sameSite: sessionConfig.cookie.sameSite,
    expires: new Date(Date.now() + sessionConfig.age * 1000),
  });

  const contextUserToken = sessionUserToken ?? ANON_TOKEN;

  context.session.sessionInfo = sessionInfo;
  context.session.updateSessionData = async (newData: SessionData): Promise<SessionInfo | null> =>
    await updateSessionData(sessionInfo?.id, newData, contextUserToken);
  context.session.changeSessionData = async (newData: SessionData): Promise<SessionInfo | null> =>
    await changeSessionData(sessionInfo?.id, newData, contextUserToken);
  context.session.destroySession = async (): Promise<void> => {
    await destroySession(sessionInfo?.id, contextUserToken);
  };

  context.auth.getUserId = (): string | null => {
    if (sessionInfo === null) return null;
    if (sessionInfo.data.userId === undefined) return null;
    return typeof sessionInfo.data.userId === 'string' ? sessionInfo.data.userId : null;
  };
  context.auth.check = (): boolean => Boolean(sessionInfo?.data.userId);
  context.auth.login = async (userId: string | undefined, userToken: string | undefined): Promise<boolean> => {
    if (userId === undefined || userToken === undefined) return false;
    try {
      const oldSessionId = sessionInfo?.id;
      const oldUserToken = typeof sessionInfo?.data.userToken === 'string' ? sessionInfo.data.userToken : undefined;

      if (oldSessionId !== undefined && oldUserToken !== undefined) {
        await destroySession(oldSessionId, oldUserToken);
      }

      const newSessionInfo = await createSessionInfo({
        userId,
        userToken,
      });

      sessionInfo = updateContextWithNewSession(
        context,
        newSessionInfo,
        userToken,
        responseData
      );

      logger.info(`User logged in`, { userId, sessionId: newSessionInfo.id });

      return true;
    } catch (err) {
      logger.error({ err }, "Login error:");
      throw err;
    }
  };

  context.auth.logout = async (): Promise<boolean> => {
    try {
      const currentUserToken = typeof sessionInfo?.data.userToken === 'string' ? sessionInfo.data.userToken : undefined;
      const currentSessionId = sessionInfo?.id;
      if (currentUserToken !== undefined && currentSessionId !== undefined) {
        await destroySession(currentSessionId, currentUserToken);
        logger.info(`User logged out`, {
          userId: sessionInfo?.data.userId,
          sessionId: currentSessionId,
        });
      }

      const newSessionInfo = await createSessionInfo({});

      sessionInfo = updateContextWithNewSession(
        context,
        newSessionInfo,
        undefined,
        responseData
      );

      return true;
    } catch (err) {
      logger.error({ err }, "Logout error");
      throw err;
    }
  };

  context.auth.logoutAll = async (): Promise<number> => {
    try {
      const currentUserToken = typeof sessionInfo?.data.userToken === 'string' ? sessionInfo.data.userToken : undefined;
      if (currentUserToken === undefined) return 0;

      const deletedCount = await destroyAllSessions(currentUserToken);
      logger.info(`User logged out all sessions`, {
        userId: sessionInfo?.data.userId,
        deletedCount,
      });

      const newSessionInfo = await createSessionInfo({});

      sessionInfo = updateContextWithNewSession(
        context,
        newSessionInfo,
        undefined,
        responseData
      );

      return deletedCount;
    } catch (err) {
      logger.error({ err }, "LogoutAll error");
      throw err;
    }
  };
};

export const wsSessionHandler = async (
  sessionId: string,
  userToken: string
): Promise<Session | null> => {
  try {
    if (!isValidUserToken(userToken)) {
      logger.warn({ sessionId }, "wsSessionHandler: invalid userToken format");
      return null;
    }

    const sessionInfo = await getSession(sessionId, userToken);

    if (sessionInfo === null) {
      logger.warn({ sessionId, userToken }, "Session not found");
      return null;
    }

    if (typeof sessionInfo.data.userId !== 'string' || sessionInfo.data.userId === '') {
      logger.warn({ sessionId, userToken }, "wsSessionHandler: session has no userId — not authenticated");
      return null;
    }

    return {
      sessionInfo,
      updateSessionData: async (newData: SessionData) =>
        await updateSessionData(sessionInfo.id, newData, userToken),
      changeSessionData: async (newData: SessionData) =>
        await changeSessionData(sessionInfo.id, newData, userToken),
      destroySession: async (): Promise<void> => {
        await destroySession(sessionInfo.id, userToken);
      },
      destroyAllSessions: async (): Promise<number> => {
        return await destroyAllSessions(userToken);
      },
    };
  } catch (err) {
    logger.error({ err, sessionId, userToken }, "wsSessionHandler error");
    return null;
  }
};

// export default { sessionHandler, wsSessionHandler };
