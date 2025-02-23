import { env } from "node:process";
export default {
    /* eslint-disable no-undef */
    port: Number(env.REDIS_PORT || 6379),
    host: env.REDIS_HOST || '127.0.0.1',
    password: env.REDIS_PASSWORD || null,
    keyPrefix: env.REDIS_PREFIX || 'uwebsocket:',
};
