import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';
import config from '#config/redis.js';

const { password, ...baseConfig } = config;

const redisConfig: RedisOptions = {
    ...baseConfig,
    ...(password !== null ? { password } : {}),
};

export default new Redis(redisConfig);
