import { generateToken } from 'metautil';
import configApp from '#config/app.js';
import redis from '#database/redis.js';
import logger from '#logger';
import User from '#app/models/User.js';
import httpRoutes from '#app/routes/httpRoutes.js';
import wsRoutes from '#app/routes/wsRoutes.js';
import { HttpData, ResponseData } from "#vendor/types/types.js";

export default {
    async ping() {
        return { status: 'OK' };
    },

    async index(httpData: HttpData, responseData: ResponseData): Promise<any> {
        const payload = httpData;
        // eslint-disable-next-line no-undef
        console.log(responseData);
        return payload;
    },
    async init(httpData: HttpData, responseData: ResponseData): Promise<any> {
        logger.info('init');
        return { status: 'ok', httpRoutes, wsRoutes };
    },
    async initOld(httpData: HttpData, responseData: ResponseData): Promise<any> {
        const token = generateToken(configApp.key, configApp.characters, 32);
        const time = Date.now();
        await redis.setex(`auth:ws:${token}`, 3600, time);
        return { token, time };
    },
    async setHeaderAndCookie(httpData: HttpData, responseData: ResponseData): Promise<any> {
        logger.info('set-header-and-cookie');
        responseData.headers.push({ name: 'test-header', value: 'test' });
        // responseData.cookies.push({
        //     name: 'cookieTest',
        //     value: 'test',
        //     path: '/',
        //     httpOnly: true,
        //     secure: true,
        //     maxAge: 3600,
        // });
        responseData.setCookie('cookieTest', 'test');
        return { status: 'ok' };
    },
    async testMiddleware(httpData: HttpData, responseData: ResponseData): Promise<any> {
        logger.info('testMiddleware handler');
        return responseData.middlewareData;
    },
    async saveUser(httpData: HttpData, responseData: ResponseData): Promise<any> {
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
