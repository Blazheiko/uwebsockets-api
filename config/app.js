import { env } from 'node:process';
const config = Object.freeze({
    /* eslint-disable no-undef */
    appName: env.APP_NAME,
    key: env.APP_KEY,
    env: env.APP_ENV,
    url: env.APP_URL,
    port: Number(env.APP_PORT),
    serveStatic: env.SERVE_STATIC,
    startMigration: env.START_MIGRATION,
    characters:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
});
export default config;
