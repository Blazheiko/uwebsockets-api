import { env } from 'node:process';
const config = Object.freeze({
    /* eslint-disable no-undef */
    appName: env.APP_NAME || 'uwebsockets-api',
    key: env.APP_KEY,
    env: env.APP_ENV,
    url: env.APP_URL,
    host: env.APP_HOST || '0.0.0.0',
    port: Number(env.APP_PORT),
    unixPath: env.APP_UNIX_PATH,
    serveStatic: env.SERVE_STATIC,
    docPage: env.DOC_PAGE || false,
    startMigration: env.START_MIGRATION,
    characters:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    reasonableCookieLimit: 10000, // Reasonable limit for cookie value
    maxUrlLength: 2048, // Reasonable limit for url length
});
export default config;
