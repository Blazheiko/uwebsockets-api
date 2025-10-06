import { RateLimit, RouteItem, MyWebSocket } from '../../types/types.js';
import logger from '#logger';
import {
    updateRateLimitCounter,
    getRateLimitKey,
    getClientIdentifier,
    logRateLimitInfo,
    type RateLimitInfo,
} from './rate-limit-counter.js';

function getWsClientIdentifier(ws: MyWebSocket): string {
    const userData = ws.getUserData();
    // Use IP address from WebSocket user data for rate limiting
    return getClientIdentifier(userData.ip || 'unknown');
}

function determineWsRateLimit(
    route: RouteItem,
    groupRateLimit?: RateLimit,
): RateLimit | null {
    // Route limits override group limits
    if (route.rateLimit) {
        return route.rateLimit;
    }

    if (groupRateLimit) {
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

export default async function checkRateLimitWs(
    ws: MyWebSocket,
    route: RouteItem,
    groupRateLimit?: RateLimit,
): Promise<WsRateLimitResult> {
    try {
        const rateLimit = determineWsRateLimit(route, groupRateLimit);

        // If limits are not configured, allow request
        if (!rateLimit) {
            return { allowed: true };
        }

        const clientId = getWsClientIdentifier(ws);
        const routeKey = getRateLimitKey(clientId, route.url);

        logger.debug(`Checking WS rate limit for ${routeKey}`, {
            windowMs: rateLimit.windowMs,
            maxRequests: rateLimit.maxRequests,
        });

        const rateLimitInfo = await updateRateLimitCounter(
            routeKey,
            rateLimit.windowMs,
        );
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
                errorMessage: `Rate limit exceeded for ${route.url}. Try again in ${retryAfter} seconds.`,
            };
        }

        logRateLimitInfo(routeKey, rateLimitInfo, true);

        return {
            allowed: true,
            rateLimitInfo,
        };
    } catch (error) {
        logger.error('WebSocket rate limit check failed', error);
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
export function createWsRateLimitErrorResponse(
    errorMessage: string,
    retryAfter: number,
    event: string,
) {
    return {
        event: event,
        status: 429,
        payload: {
            error: 'Rate limit exceeded',
            message: errorMessage,
            retryAfter: retryAfter,
            timestamp: new Date().toISOString(),
        },
    };
}
