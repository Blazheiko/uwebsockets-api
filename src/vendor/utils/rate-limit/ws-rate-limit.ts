import type {
  RateLimit,
  RouteItem,
  MyWebSocket,
  WsResponseData,
} from "#vendor/types/types.js";
import logger from "#vendor/utils/logger.js";
import {
  updateRateLimitCounter,
  getRateLimitKey,
  getClientIdentifier,
  logRateLimitInfo,
  type RateLimitInfo,
} from "./rate-limit-counter.js";

function getWsClientIdentifier(ws: MyWebSocket): string {
  const userData = ws.getUserData();
  // Use IP address from WebSocket user data for rate limiting
  if (typeof userData.ip !== "string") {
    return "unknown";
  }
  if (userData.ip === "") {
    return "unknown";
  }
  return getClientIdentifier(userData.ip);
}

function determineWsRateLimit(
  route: RouteItem,
  groupRateLimit?: RateLimit,
): RateLimit | null {
  // Route limits override group limits
  if (route.rateLimit !== undefined) {
    return route.rateLimit;
  }

  if (groupRateLimit !== undefined) {
    return groupRateLimit;
  }

  return null;
}

interface WsRateLimitResult {
  allowed: boolean;
  rateLimitInfo?: RateLimitInfo;
  retryAfter?: number;
  errorMessage?: string;
}

export default function checkRateLimitWs(
  ws: MyWebSocket,
  route: RouteItem,
  groupRateLimit?: RateLimit,
): WsRateLimitResult {
  try {
    const rateLimit = determineWsRateLimit(route, groupRateLimit);

    // If limits are not configured, allow request
    if (rateLimit === null) {
      return { allowed: true };
    }

    const clientId = getWsClientIdentifier(ws);
    const routeKey = getRateLimitKey(clientId, route.url);

    logger.debug(`Checking WS rate limit for ${routeKey}`, {
      windowMs: rateLimit.windowMs,
      maxRequests: rateLimit.maxRequests,
    });

    const rateLimitInfo = updateRateLimitCounter(routeKey, rateLimit.windowMs);
    rateLimitInfo.maxRequests = rateLimit.maxRequests;

    // Check limit exceeded
    if (rateLimitInfo.requests > rateLimit.maxRequests) {
      logRateLimitInfo(routeKey, rateLimitInfo, false);

      const retryAfter = Math.ceil(
        (rateLimitInfo.resetTime - Date.now()) / 1000,
      );

      return {
        allowed: false,
        rateLimitInfo,
        retryAfter,
        errorMessage: `Rate limit exceeded for ${route.url}. Try again in ${String(retryAfter)} seconds.`,
      };
    }

    logRateLimitInfo(routeKey, rateLimitInfo, true);

    return {
      allowed: true,
      rateLimitInfo,
    };
  } catch (error) {
    logger.error({ err: error }, "WebSocket rate limit check failed");
    // In case of error, allow request to not block WebSocket API
    return { allowed: true };
  }
}

/**
 * Creates a rate limit error response for WebSocket
 * @param errorMessage - Error message
 * @param retryAfter - Retry after seconds
 * @param event - Original event name
 * @returns WebSocket error response object
 */
export const createWsRateLimitErrorResponse = (
  errorMessage: string,
  retryAfter: number,
  event: string,
): WsResponseData => {
  return {
    data: null,
    error: {
      code: 429,
      message: `${errorMessage} Try again in ${String(retryAfter)} seconds.`,
    },
    event: event,
    status: "429",
    timestamp: new Date().getTime(),
  };
};
