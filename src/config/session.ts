import { duration } from 'metautil';
import { env } from 'node:process';
export default Object.freeze({
    // enabled: true,
    storage: 'redis',
    cookieName: 'uapi',
    age: Math.floor( duration('24h')/1000 ), // d - days, h - hours, m - minutes, s - seconds

    /**
     * Configuration for session cookie and the cookie store
     */
    cookie: {
        path: '/',
        httpOnly: true,
        secure: env['APP_ENV'] !== 'local',
        sameSite: 'Lax', // 'Strict' || 'Lax' . 'None' is not secure use only for CSRF protection
    },

});