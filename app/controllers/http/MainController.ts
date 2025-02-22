// import { generateToken } from 'metautil';
// import configApp from '#config/app.js';
// import redis from '#database/redis.js';
import logger from '#logger';
import User from '#app/models/User.js';
import httpRoutes from '#app/routes/httpRoutes.js';
import wsRoutes from '#app/routes/wsRoutes.js';
// import { HttpData, ResponseData } from '#vendor/types/types.d.ts';
import { HttpData, ResponseData } from './../../../vendor/types/types.js';

export default {
    async ping() {
        return { status: 'ok' };
    },

    async index(httpData: HttpData, responseData: ResponseData): Promise<any> {
        const payload = httpData;
        // eslint-disable-next-line no-undef
        console.log(responseData);
        return payload;
    },
    async testParams(httpData: HttpData, responseData: ResponseData): Promise<any> {
        const params = httpData.params;
        const query = httpData.query.getAll('test');
        console.log('testParams');
        return { params, query, status: 'ok' };
    },
    async init(httpData: HttpData, responseData: ResponseData): Promise<any> {
        logger.info('init');
        return { status: 'ok', httpRoutes, wsRoutes };
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
        return { m: responseData.middlewareData , status: 'ok'};
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
