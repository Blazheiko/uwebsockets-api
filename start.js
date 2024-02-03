import 'dotenv/config';
import logger from '#logger';
import * as server from '#start/server.js';
import configApp from '#config/app.js';
import db from '#database/db.js';
import redis from '#start/redis.js';

logger.info(configApp);
// console.log({ configApp })

const migratioDB = async () => {
    await db.migrate.up({ directory: './database/migrations' });
};
const testRedis = async () => {
    await redis.set('test', Date.now().toString());
};

const start = async () => {
    try {
        await migratioDB();
        logger.info('migrate success');
        await testRedis();
        logger.info('test redis success');

        server.init();
    } catch (err) {
        /* eslint-disable no-undef */
        console.error(err);
        process.exit(1);
    }
};
start().then(() => {
    logger.info('start success');
});
