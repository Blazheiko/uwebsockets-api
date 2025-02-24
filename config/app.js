import { env } from 'node:process';
const config = Object.freeze({
    /* eslint-disable no-undef */
    appName: env.APP_NAME || 'uwebsockets-api',
    key: env.APP_KEY || '1234567890',
    env: env.APP_ENV,
    url: env.APP_URL,
    host: env.APP_HOST || '127.0.0.1',
    port: Number(env.APP_PORT),
    unixPath: env.APP_UNIX_PATH,
    serveStatic: env.SERVE_STATIC,
    startMigration: env.START_MIGRATION,
    characters:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
});
export default config;
