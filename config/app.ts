import { env } from 'node:process';
import { normalizePath } from '#vendor/utils/network/http-request-handlers.js';

// Функция для преобразования строки в логическое значение
// Поддерживаемые значения для true: 'true', '1', 'yes', 'on'
// Поддерживаемые значения для false: 'false', '0', 'no', 'off' или пустое значение
function parseBoolean(
    value: string | undefined,
    defaultValue: boolean = false,
): boolean {
    if (value === undefined) return defaultValue;
    return (
        value === 'true' || value === '1' || value === 'yes' || value === 'on'
    );
}

// Parse port with validation and default value
function parsePort(
    value: string | undefined,
    defaultValue: number = 3000,
): number {
    console.log('parsePort value: ' + value);
    if (value === undefined) return defaultValue;
    const port = Number(value);
    if (isNaN(port) || port < 1 || port > 65535) {
        return defaultValue;
    }
    return port;
}

const config = Object.freeze({
    /* eslint-disable no-undef */
    appName: env.APP_NAME || 'uwebsockets-api',
    key: env.APP_KEY,
    env: env.APP_ENV,
    url: env.APP_URL,
    domain: env.DOMAIN || '127.0.0.1',
    host: env.HOST || '0.0.0.0',
    port: parsePort(process.env.PORT, 3000),
    pathPrefix: normalizePath(env.API_PATH_PREFIX || 'api'),
    unixPath: env.APP_UNIX_PATH,
    // Примеры использования логических значений:
    // SERVE_STATIC=true, SERVE_STATIC=1, SERVE_STATIC=yes, SERVE_STATIC=on
    serveStatic: parseBoolean(env.SERVE_STATIC, false),
    // DOC_PAGE=false, DOC_PAGE=0, DOC_PAGE=no, DOC_PAGE=off или не указано
    docPage: parseBoolean(env.DOC_PAGE, false),
    characters:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    reasonableCookieLimit: 10000, // Reasonable limit for cookie value
    reasonableCookieKeyLimit: 255, // Reasonable limit for cookie key length
    maxUrlLength: 2048, // Reasonable limit for url length
    accessTokenLength: 16, // Reasonable limit for access token length
});
export default config;
