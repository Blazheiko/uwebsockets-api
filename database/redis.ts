import Redis from 'ioredis';
import config from '#config/redis.js';

// @ts-ignore
export default new Redis(config);
