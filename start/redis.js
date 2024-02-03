import Redis from 'ioredis';
import config from '#config/redis.js';
const redis = new Redis(config);

export default redis;
