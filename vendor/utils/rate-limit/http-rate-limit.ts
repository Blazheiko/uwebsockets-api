import {
    HttpData,
    RateLimit,
    ResponseData,
    RouteItem,
} from '../../types/types.js';
import logger from '#logger';
import {
    updateRateLimitCounter,
    getRateLimitKey,
    getClientIdentifier,
    logRateLimitInfo,
    type RateLimitInfo,
} from './rate-limit-counter.js';

function getHttpClientIdentifier(httpData: HttpData): string {
    return getClientIdentifier(httpData.ip || 'unknown');
}

function determineRateLimit(
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

export default async function checkRateLimit(
    httpData: HttpData,
    responseData: ResponseData,
    route: RouteItem,
    groupRateLimit?: RateLimit,
): Promise<boolean> {
    try {
        const rateLimit = determineRateLimit(route, groupRateLimit);

        // If limits are not configured, skip check
        if (!rateLimit) {
            return true;
        }

        const clientId = getHttpClientIdentifier(httpData);
        const routeKey = getRateLimitKey(clientId, route.url);

        logger.debug(`Checking rate limit for ${routeKey}`, {
            windowMs: rateLimit.windowMs,
            maxRequests: rateLimit.maxRequests,
        });

        const rateLimitInfo = await updateRateLimitCounter(
            routeKey,
            rateLimit.windowMs,
        );
        rateLimitInfo.maxRequests = rateLimit.maxRequests;

        // Add headers with limit information
        responseData.setHeader(
            'X-RateLimit-Limit',
            rateLimit.maxRequests.toString(),
        );
        responseData.setHeader(
            'X-RateLimit-Remaining',
            Math.max(
                0,
                rateLimit.maxRequests - rateLimitInfo.requests,
            ).toString(),
        );
        responseData.setHeader(
            'X-RateLimit-Reset',
            Math.ceil(rateLimitInfo.resetTime / 1000).toString(),
        );

        // Check limit exceeded
        if (rateLimitInfo.requests > rateLimit.maxRequests) {
            logRateLimitInfo(routeKey, rateLimitInfo, false);

            responseData.status = 429;
            responseData.payload = {
                message: 'Too many requests, please try again later.',
                retryAfter: Math.ceil(
                    (rateLimitInfo.resetTime - Date.now()) / 1000,
                ),
            };
            responseData.setHeader(
                'Retry-After',
                Math.ceil(
                    (rateLimitInfo.resetTime - Date.now()) / 1000,
                ).toString(),
            );

            return false;
        }

        logRateLimitInfo(routeKey, rateLimitInfo, true);

        return true;
    } catch (error) {
        logger.error('Rate limit check failed', error);
        // In case of error, skip check to not block API
        return true;
    }
}
