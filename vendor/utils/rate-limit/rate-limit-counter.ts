import redis from '#database/redis.js';
import logger from '#logger';

interface RateLimitInfo {
    windowMs: number;
    maxRequests: number;
    requests: number;
    resetTime: number;
}

/**
 * Updates rate limit counter in Redis using sliding window approach
 * @param key - Redis key for rate limiting
 * @param windowMs - Time window in milliseconds
 * @returns Promise with rate limit information
 */
export async function updateRateLimitCounter(key: string, windowMs: number): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Use Redis transaction for atomicity
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Get request count in current window
    pipeline.zcard(key);
    
    // Set TTL for key
    pipeline.expire(key, Math.ceil(windowMs / 1000) + 10); // +10 seconds for safety
    
    const results = await pipeline.exec();
    
    if (!results || results.length < 3) {
        throw new Error('Redis pipeline failed');
    }
    
    const requestCount = results[2][1] as number;
    const resetTime = now + windowMs;
    
    return {
        windowMs,
        maxRequests: 0, // will be set later
        requests: requestCount,
        resetTime
    };
}

/**
 * Generates rate limit key for client identification
 * @param clientId - Client identifier (usually IP-based)
 * @param route - Route identifier
 * @returns Combined rate limit key
 */
export function getRateLimitKey(clientId: string, route: string): string {
    return `${clientId}:${route}`;
}

/**
 * Gets client identifier for rate limiting
 * @param ip - Client IP address
 * @returns Rate limit client identifier
 */
export function getClientIdentifier(ip: string): string {
    return `rate_limit:${ip || 'unknown'}`;
}

/**
 * Logs rate limit information for debugging
 * @param key - Rate limit key
 * @param rateLimitInfo - Rate limit information
 * @param passed - Whether rate limit check passed
 */
export function logRateLimitInfo(
    key: string, 
    rateLimitInfo: RateLimitInfo, 
    passed: boolean
): void {
    if (passed) {
        logger.debug(`Rate limit check passed for ${key}`, {
            requests: rateLimitInfo.requests,
            maxRequests: rateLimitInfo.maxRequests
        });
    } else {
        logger.warn(`Rate limit exceeded for ${key}`, {
            requests: rateLimitInfo.requests,
            maxRequests: rateLimitInfo.maxRequests,
            resetTime: rateLimitInfo.resetTime
        });
    }
}

export type { RateLimitInfo };
