import type {
  Auth,
  HttpContext,
  HttpData,
  ResponseData,
  Session,
} from "#vendor/types/types.js";

import logger from "#vendor/utils/logger.js";
import type { BaseType } from "@arktype/type";
import { randomUUID } from "crypto";

const getDefaultSession = (): Session => {
  return {
    sessionInfo: null,
    updateSessionData: async () => Promise.resolve(null),
    changeSessionData: async () => Promise.resolve(null),
    destroySession: async () => Promise.resolve(),
    destroyAllSessions: async () => Promise.resolve(0),
  };
};
const getDefaultAuth = (): Auth => ({
  getUserId: () => null,
  check: () => false,
  login: () => Promise.resolve(false),
  logout: () => Promise.resolve(false),
  logoutAll: () => Promise.resolve(0),
});

const session: Session = getDefaultSession();
const auth: Auth = getDefaultAuth();

export default (
  httpData: HttpData,
  responseData: ResponseData,
  validator: BaseType | undefined,
): HttpContext => {
  const requestId = randomUUID();
  const requestLogger = logger.child({ requestId }) as unknown as HttpContext["logger"];

  return {
    requestId,
    logger: requestLogger,
    httpData,
    validator,
    responseData,
    session,
    auth,
  };
};
