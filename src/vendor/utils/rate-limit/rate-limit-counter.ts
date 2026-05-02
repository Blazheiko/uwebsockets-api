import logger from "#vendor/utils/logger.js";

interface RateLimitInfo {
  windowMs: number;
  maxRequests: number;
  requests: number;
  resetTime: number;
}

interface Bucket {
  timestamps: number[];
  windowMs: number;
}

// Sliding window rate limiter. Per-process, in-memory, synchronous.
// Сделано sync, чтобы вызывающий handler не делал await до регистрации
// res.onData() в uWebSockets.js (иначе тело маленьких POST теряется).
//
// Если сервер будет горизонтально масштабироваться — каждый инстанс держит
// свой счётчик. Эффективный лимит умножается на число инстансов.
const store = new Map<string, Bucket>();

// Soft cap на количество уникальных ключей, чтобы Map не тёк от разовых IP.
const MAX_KEYS = 100_000;

const gcExpired = (): void => {
  const now = Date.now();
  let removed = 0;
  for (const [k, bucket] of store) {
    const last = bucket.timestamps[bucket.timestamps.length - 1];
    // Keep the bucket while the last request is still inside its own window.
    if (last === undefined || last + bucket.windowMs < now) {
      store.delete(k);
      removed++;
    }
  }
  if (removed > 0) {
    logger.debug({ removed, remaining: store.size }, "rate-limit GC");
  }
};

// Периодический GC. unref(), чтобы не держать event loop.
// Run every 60s — fine-grained enough for most windows.
setInterval(gcExpired, 60_000).unref();

/**
 * Updates rate limit counter using a sliding window approach.
 * Синхронная, безопасна для одиночного Node-процесса.
 */
export function updateRateLimitCounter(
  key: string,
  windowMs: number,
): RateLimitInfo {
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = store.get(key);
  if (bucket === undefined) {
    if (store.size >= MAX_KEYS) gcExpired();
    bucket = { timestamps: [], windowMs };
    store.set(key, bucket);
  } else {
    // Ленивая чистка устаревших отметок на каждом обращении.
    // Re-read timestamps[drop] on every iteration — do NOT hoist it.
    let drop = 0;
    while (drop < bucket.timestamps.length) {
      const ts = bucket.timestamps[drop];
      if (ts === undefined || ts > windowStart) break;
      drop++;
    }
    if (drop > 0) bucket.timestamps.splice(0, drop);
  }

  bucket.timestamps.push(now);

  return {
    windowMs,
    maxRequests: 0, // will be set by caller
    requests: bucket.timestamps.length,
    resetTime: (bucket.timestamps[0] ?? now) + windowMs,
  };
}

/**
 * Generates rate limit key for client identification
 */
export function getRateLimitKey(clientId: string, route: string): string {
  return `${clientId}:${route}`;
}

/**
 * Gets client identifier for rate limiting
 */
export function getClientIdentifier(ip: string): string {
  return `rate_limit:${ip === "" ? "unknown" : ip}`;
}

/**
 * Logs rate limit information for debugging
 */
export function logRateLimitInfo(
  key: string,
  rateLimitInfo: RateLimitInfo,
  passed: boolean,
): void {
  if (passed) {
    logger.debug(
      {
        requests: rateLimitInfo.requests,
        maxRequests: rateLimitInfo.maxRequests,
      },
      `Rate limit check passed for ${key}`,
    );
  } else {
    logger.warn(
      {
        requests: rateLimitInfo.requests,
        maxRequests: rateLimitInfo.maxRequests,
        resetTime: rateLimitInfo.resetTime,
      },
      `Rate limit exceeded for ${key}`,
    );
  }
}

export type { RateLimitInfo };
