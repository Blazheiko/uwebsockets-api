const config = Object.freeze({
    /* eslint-disable no-undef */
    appName: process.env.APP_NAME,
    key: process.env.APP_KEY,
    env: process.env.APP_ENV,
    url: process.env.APP_URL,
    port: Number(process.env.APP_PORT),
    serveStatic: process.env.SERVE_STATIC,
    characters:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
});
export default config;
