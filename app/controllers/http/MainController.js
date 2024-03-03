import { generateToken } from 'metautil';
import configApp from '#config/app.js';
import redis from '#database/redis.js';

export default {
    init(httpData, responseData) {
        const token = generateToken(configApp.key, configApp.characters, 32);
        const time = Date.now();
        redis.setex(`auth:ws:${token}`, 3600, time);
        responseData.payload = { token, time };
        return responseData;
    },
};
