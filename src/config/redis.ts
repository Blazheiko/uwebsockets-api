import { env } from "node:process";
export default Object.freeze({
     
    port: Number(env['REDIS_PORT'] || 6379),
    host: env['REDIS_HOST'] || '127.0.0.1',
    password: env['REDIS_PASSWORD'] || null,
    keyPrefix: env['REDIS_PREFIX'] || 'uwebsocket:', // max 16 characters long, only letters, numbers, :,_,-
});
