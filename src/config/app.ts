import { env } from "node:process";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizePath(path: string): string {
  if (path === "") return "";
  let normalizedPath = stripTrailingSlash(path);
  if (normalizedPath.startsWith("/")) normalizedPath = normalizedPath.slice(1);
  return normalizedPath;
}

function normalizeUrl(url: string | undefined): string {
  if (url === undefined) return "";
  return stripTrailingSlash(url);
}

// Функция для преобразования строки в логическое значение
// Поддерживаемые значения для true: 'true', '1', 'yes', 'on'
// Поддерживаемые значения для false: 'false', '0', 'no', 'off' или пустое значение
function parseBoolean(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

// Parse size in bytes with validation and default value
function parseSize(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const size = Number(value);
  if (isNaN(size) || size <= 0) return defaultValue;
  return size;
}

// Parse port with validation and default value
function parsePort(value: string | undefined, defaultValue = 3000): number {
  if (value === undefined) return defaultValue;
  const port = Number(value);
  if (isNaN(port) || port < 1 || port > 65535) {
    return defaultValue;
  }
  return port;
}

const config = Object.freeze({
  appName: env["APP_NAME"] ?? "uwebsockets-api",
  key: env["APP_KEY"],
  env: env["APP_ENV"],
  url: normalizeUrl(env["APP_URL"]),
  frontendUrl: normalizeUrl(env["FRONTEND_URL"] ?? env["APP_URL"]),
  landingUrl: normalizeUrl(env["LANDING_URL"]),
  cdnUrl: env["CDN_URL"] ?? "",
  domain: env["DOMAIN"] ?? "127.0.0.1",
  host: env["HOST"] ?? "0.0.0.0",
  port: parsePort(env["PORT"], 3000),
  pathPrefix: normalizePath(env["API_PATH_PREFIX"] ?? "api"),
  unixPath: env["APP_UNIX_PATH"],
  // Примеры использования логических значений:
  // SERVE_STATIC=true, SERVE_STATIC=1, SERVE_STATIC=yes, SERVE_STATIC=on
  serveStatic: parseBoolean(env["SERVE_STATIC"], false),
  // DOC_PAGE=false, DOC_PAGE=0, DOC_PAGE=no, DOC_PAGE=off или не указано
  docPage: parseBoolean(env["DOC_PAGE"], false),
  characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  reasonableCookieLimit: 10000, // Reasonable limit for cookie value
  reasonableCookieKeyLimit: 255, // Reasonable limit for cookie key length
  maxUrlLength: 2048, // Reasonable limit for url length
  accessTokenLength: 16, // Reasonable limit for access token length
  maxBodySize: parseSize(env['APP_MAX_BODY_SIZE'], 2_097_152),
  maxJsonBodySize: parseSize(env['APP_MAX_JSON_BODY_SIZE'], 2_097_152),
  maxMultipartBodySize: parseSize(env['APP_MAX_MULTIPART_BODY_SIZE'], 52_428_800),
  maxOctetStreamBodySize: parseSize(env['APP_MAX_OCTET_BODY_SIZE'], 52_428_800),
});
export default config;
