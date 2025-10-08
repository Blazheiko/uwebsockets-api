import { env } from 'node:process';
export default Object.freeze({
    default: {
        path: '/',
        httpOnly: true,
        secure: env.APP_ENV !== 'local',
        maxAge: 3600,
        sameSite: 'None',
    },
});
