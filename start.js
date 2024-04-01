import process from 'node:process';
import 'dotenv/config';
import vine from '@vinejs/vine';
import logger from '#logger';
import { init, stop } from '#vendor/start/server.js';
import configApp from '#config/app.js';
import db from '#database/db.js';
import redis from '#database/redis.js';
import schemas from '#app/validate/schemas/schemas.js';
import validators from '#vendor/start/validators.js';
import '#app/routes/httpRoutes.js';
import '#app/routes/wsRoutes.js';
import watcher from '#vendor/start/watcher.js';
// import { getWsRoutes } from '#vendor/start/router.js';

logger.info(configApp);
// console.log({ configApp })

const migratioDB = async () => {
    await db.migrate.up({ directory: './database/migrations' });
};
const testRedis = async () => {
    await redis.set('test', Date.now().toString());
};

const compileValidateSchema = () => {
    const schemaKeys = Object.keys(schemas);
    schemaKeys.forEach((key) => {
        validators[key] = vine.compile(schemas[key]);
    });
};

const start = async (isRestart) => {
    try {
        /* eslint-disable no-undef */
        process.title = configApp.appName;
        logger.info(
            'use module: uws_' +
                process.platform +
                '_' +
                process.arch +
                '_' +
                process.versions.modules +
                '.node',
        );
        compileValidateSchema();
        // const wsRoutes = getWsRoutes();
        // logger.info(wsRoutes);
        if (!isRestart) await migratioDB();
        logger.info('migrate success');
        await testRedis();
        logger.info('test redis success');

        await init();
        process.on('SIGINT', stopSIGINT);
        process.on('SIGHUP', stopSIGHUP);
        process.on('SIGTERM', stopSIGTERM);
        process.on('uncaughtException', stopUncaughtException);
    } catch (err) {
        /* eslint-disable no-undef */
        console.error(err);
        process.exit(1);
    }
};

const removeListeners = () => {
    process.removeListener('SIGINT', stopSIGINT);
    process.removeListener('SIGHUP', stopSIGHUP);
    process.removeListener('SIGTERM', stopSIGTERM);
    process.removeListener('uncaughtException', stopUncaughtException);
};

const stopHandler = (type) => {
    stop(type);
    removeListeners();
};

let timerRestart = null;

const restart = () => {
    stop('restart');
    if (timerRestart) clearTimeout(timerRestart);
    timerRestart = setTimeout(() => {
        start(true).then(() => {
            logger.info('restart success');
        });
    }, 1000);
};
const stopSIGINT = () => {
    logger.info('stop SIGINT');
    stopHandler('SIGINT');
    process.exit(1);
};
const stopSIGHUP = () => {
    logger.info('stop SIGHUP');
    stopHandler('SIGHUP');
    process.exit(1);
};
const stopSIGTERM = () => {
    logger.info('stop SIGTERM');
    stopHandler('SIGTERM');
    process.exit(1);
};
const stopUncaughtException = (err, origin) => {
    logger.error('event uncaughtException');
    console.error(err);
    console.error(origin);
    stopHandler('uncaughtException');
    process.exit(1);
};
let isWatch = false;
start(false).then(() => {
    logger.info('start success');
    const watchEnv = ['dev', 'development', 'local'];
    if (!isWatch && watchEnv.includes(configApp.env)) {
        watcher(restart);
        isWatch = true;
    }
});
