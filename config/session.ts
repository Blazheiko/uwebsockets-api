import { env } from "node:process";
import { duration } from 'metautil';
export default {
    enabled: true,
    cookieName: 'uapi',
    age: Math.floor( duration('2h')/1000 ), // d - days, h - hours, m - minutes, s - seconds

    /**
     * Configuration for session cookie and the
     * cookie store
     */
    cookie: {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
    },

};