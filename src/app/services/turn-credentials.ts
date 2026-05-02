import { createHmac } from "crypto";
import config from "#config/turn.js";

interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

// interface TurnConfig {
//   secret: string;
//   host: string;
//   ttlSeconds?: number;
// }

/**
 * Генерирует временные TURN credentials по стандарту RFC 5389
 *
 * Алгоритм:
 * 1. username = "<unix_timestamp_expiry>:<user_identifier>"
 * 2. credential = Base64(HMAC-SHA1(secret, username))
 *
 * Coturn проверяет, что timestamp не истёк и HMAC валиден
 */
export function generateTurnCredentials(userId: string): TurnCredentials {
  const { secret, host, ttlSeconds } = config;
  if (secret.trim() === "" || host.trim() === "") {
    throw new Error("TURN is not configured");
  }

  // Время истечения токена в Unix timestamp
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

  // Username содержит время истечения — Coturn проверяет его
  const username = `${String(expiresAt)}:${userId}`;

  // HMAC-SHA1 от username с нашим секретом
  const credential = createHmac("sha1", secret)
    .update(username)
    .digest("base64");

  return {
    urls: [
      // STUN — для получения публичного IP (всегда порт 3478)
      `stun:${host}:3478`,

      // TURN UDP — основной канал для медиа (порт 3478)
      `turn:${host}:3478?transport=udp`,

      // TURN TCP — если UDP заблокирован у клиента (порт 3478)
      `turn:${host}:3478?transport=tcp`,

      // TURNS (TLS) — самый надежный способ пройти через корпоративные файрволы (порт 5349)

      `turns:${host}:5349?transport=tcp`,
    ],
    username,
    credential,
    ttl: ttlSeconds,
  };
}
