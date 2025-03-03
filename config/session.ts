import { env } from "node:process";
export default {
    enabled: true,
    cookieName: 'uapi',
    age: '2h',

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