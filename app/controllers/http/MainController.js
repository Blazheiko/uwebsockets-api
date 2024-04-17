import { generateToken } from 'metautil';
import configApp from '#config/app.js';
import redis from '#database/redis.js';
import logger from '#logger';
import User from '#app/models/User.js';

export default {
    async index(httpData, responseData) {
        responseData.payload = httpData;
        return responseData;
    },
    async init(httpData, responseData) {
        const token = generateToken(configApp.key, configApp.characters, 32);
        const time = Date.now();
        await redis.setex(`auth:ws:${token}`, 3600, time);
        responseData.payload = { token, time };
        return responseData;
    },
    async setHeaderAndCookie(httpData, responseData) {
        logger.info('set-header-and-cookie');
        responseData.headers.push({ name: 'test-header', value: 'test' });
        responseData.cookies.push({
            name: 'cookieTest',
            value: 'test',
            path: '/',
            httpOnly: true,
            secure: true,
            maxAge: 3600,
        });
        return responseData;
    },
    async testMiddleware(httpData, responseData) {
        logger.info('testMiddleware handler');
        responseData.payload = responseData.middlewareData;
        return responseData;
    },
    async saveUser(httpData, responseData) {
        logger.info('saveUser');
        const { payload } = httpData;
        // console.log({payload});
        const user = await User.create({
            name: payload.name,
            email: payload.email,
            password: payload.password,
        });
        // console.log(user);
        responseData.payload = { status: 'ok', user };
        return responseData;
    },
};
