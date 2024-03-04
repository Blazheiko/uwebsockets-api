import { generateToken } from 'metautil';
import configApp from '#config/app.js';
import redis from '#database/redis.js';
import logger from '#logger';
import User from '#app/models/User.js';

export default {
    init(httpData, responseData) {
        const token = generateToken(configApp.key, configApp.characters, 32);
        const time = Date.now();
        redis.setex(`auth:ws:${token}`, 3600, time);
        responseData.payload = { token, time };
        return responseData;
    },
    async saveUser(httpData, responseData) {
        logger.info('saveUser');
        const { payload } = httpData;
        // console.log({payload});
        // const user = await User.create({
        //     name: payload.username,
        //     email: payload.email,
        //     password: payload.password,
        // });
        responseData.payload = { status: 'ok' };
        return responseData;
    },
};
