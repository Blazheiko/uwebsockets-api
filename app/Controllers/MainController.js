import { generateToken } from 'metautil';
import configApp from '#config/app.js';

export default {
    init(httpData, responseData) {
        const token = generateToken(configApp.key, configApp.characters, 32);
        responseData.payload = { token };
        return responseData;
    },
};
