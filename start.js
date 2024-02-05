import 'dotenv/config';
import vine from "@vinejs/vine";
import logger from '#logger';
import { init, stop } from '#start/server.js';
import configApp from '#config/app.js';
import db from '#database/db.js';
import redis from '#start/redis.js';
import schemas from "#app/validate/schemas/schemas.js";
import validators from "#app/validate/validators.js";


logger.info(configApp);
// console.log({ configApp })

const migratioDB = async () => {
    await db.migrate.up({ directory: './database/migrations' });
};
const testRedis = async () => {
    await redis.set('test', Date.now().toString());
};

const compileValidateSchema = () => {
    const schemaKeys = Object.keys(schemas)
    schemaKeys.forEach( key => {
        validators[key]  = vine.compile(schemas[key])
    })
}

const start = async () => {
    try {
        compileValidateSchema();
        await migratioDB();
        logger.info('migrate success');
        await testRedis();
        logger.info('test redis success');

        init();
    } catch (err) {
        /* eslint-disable no-undef */
        console.error(err);
        process.exit(1);
    }
};
start().then(() => {
    logger.info('start success');
    process.on('SIGINT', () => stop('SIGINT'));
    process.on('SIGHUP', () => stop('SIGHUP'));
    process.on('SIGTERM', () => stop('SIGTERM'));

    process.on('uncaughtException', (err, origin) => {
        logger.error('event uncaughtException');
        console.error(err);
        console.error(origin);
        stop('uncaughtException');
    });
});
