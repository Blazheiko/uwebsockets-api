// import { generateToken } from 'metautil';
// import configApp from '#config/app.js';
// import redis from '#database/redis.js';
import logger from '#logger';
import User from '#app/models/User.js';
import httpRoutes from '#app/routes/httpRoutes.js';
import wsRoutes from '#app/routes/wsRoutes.js';
import { HttpContext } from './../../../vendor/types/types.js';
import { generateKey } from 'metautil';
import redis from '#database/redis.js';
import configApp from '#config/app.js';
import configSession from '#config/session.js';

export default {
    async ping() {
        return { status: 'ok' };
    },
    
    async testHeaders({ httpData }: HttpContext): Promise<any> {
        logger.info('testHeaders');
        const headers: any[] = [];
        httpData.headers.forEach((value, key) => {
            headers.push({ key, value});
        });
        return { status: 'ok' , headers };
    },

    async getSetCookies({ httpData }: HttpContext): Promise<any> {
        logger.info('testCookies');
        const cookies: any[] = [];
        httpData.cookies.forEach((value, key) => {
            cookies.push({ key, value});
        });

        return { status: 'ok' , cookies };
    },
    async testSession({ session, httpData }: HttpContext): Promise<any> {
        logger.info('testSession');
        logger.info(session);
        const cookies: any[] = [];
        httpData.cookies.forEach((value, key) => {
            cookies.push({ key, value});
        });
        const sessionInfo = session?.sessionInfo;

        return { status: 'ok' , cookies , sessionInfo };
    },
    async testApiSession({ session, httpData }: HttpContext): Promise<any> {
        logger.info('testApiSession');
        const headers: any[] = [];
        httpData.headers.forEach((value, key) => {
            headers.push({ key, value});
        });
        
        const sessionInfo = session?.sessionInfo;

        return { status: 'ok' ,headers, sessionInfo };
    },

    async index({ httpData, responseData }: HttpContext): Promise<any> {
        const payload = httpData;
        // eslint-disable-next-line no-undef
        console.log(responseData);
        return { payload, responseData };
    },
    async testParams({ httpData }: HttpContext): Promise<any> {
        const params = httpData.params;
        const query = httpData.query.getAll('test');
        console.log('testParams');
        return { params, query, status: 'ok' };
    },
    async init({ responseData, session }: HttpContext): Promise<any> {
        logger.info('init');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }
        const user = await User.query().findUnique({ where: { id: Number(userId) } });
        if (!user) {
            return { status: 'unauthorized', message: 'User not found' };
        }
        const token = generateKey(configApp.characters, 16);
        await redis.setex(
            `auth:ws:${token}`,
            60,
            JSON.stringify({ sessionId: sessionInfo.id, userId: user.id }),
        );
        
        return { status: 'ok', user: User.serialize(user),  wsUrl: `ws://127.0.0.1:8088/websocket/${token}` };
    },
    
    async setHeaderAndCookie({ responseData }: HttpContext): Promise<any> {
        logger.info('set-header-and-cookie');
        responseData.headers.push({ name: 'test-header', value: 'test' });
        responseData.setCookie({
            name: 'cookieTest1',
            value: 'test',
            path: '/',
            httpOnly: true,
            secure: false,
            maxAge: 3600,
        });
        responseData.setCookie('cookieTest2', 'test');
        return { status: 'ok' };
    },
    async testMiddleware({ responseData }: HttpContext): Promise<any> {
        logger.info('testMiddleware handler');
        return { m: responseData.middlewareData, status: 'ok' };
    },
    async saveUser({ httpData }: HttpContext): Promise<any> {
        logger.info('saveUser');
        const { payload } = httpData;
        const user = await User.create({
            name: payload.name,
            email: payload.email,
            password: payload.password,
        });
        return { status: 'ok', user };
    },
};
