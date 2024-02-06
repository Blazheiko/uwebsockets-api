import { generateToken } from 'metautil';
import config from '#config/app.js';
const register = (payload) => {
    const token = generateToken(config.key, config.characters, 32);
};
