import Redis from 'ioredis';
import config from '#config/redis.js';

export default new Redis(config);
