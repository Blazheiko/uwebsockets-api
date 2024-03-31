import process from 'node:process';
import chokidar from 'chokidar';
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

const start = async () => {
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
        await migratioDB();
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

const restart = () => {
    process.removeListener('SIGINT', stopSIGINT);
    process.removeListener('SIGHUP', stopSIGHUP);
    process.removeListener('SIGTERM', stopSIGTERM);
    process.removeListener('uncaughtException', stopUncaughtException);
    stop('restart');
    setTimeout(() => {
        start().then(() => {
            logger.info('restart success');
        });
    }, 200);
};
const stopSIGINT = () => {
    logger.info('stop SIGINT');
    stop('SIGINT');
};
const stopSIGHUP = () => {
    logger.info('stop SIGHUP');
    stop('SIGHUP');
};
const stopSIGTERM = () => {
    logger.info('stop SIGTERM');
    stop('SIGTERM');
};
const stopUncaughtException = (err, origin) => {
    logger.error('event uncaughtException');
    console.error(err);
    console.error(origin);
    stop('uncaughtException');
};
start().then(() => {
    logger.info('start success');
    const watchEnv = ['dev', 'development', 'local'];
    if (watchEnv.includes(configApp.env)) {
        const watcher = chokidar.watch(process.cwd(), {
            ignored: [
                `${process.cwd()}/node_modules`,
                `${process.cwd()}/start.js`,
            ],
            persistent: false,
            stabilityThreshold: 2000,
            awaitWriteFinish: true,
        });

        watcher
            .on('add', (path) => {
                logger.info(`File ${path} has been added`);
                restart();
            })
            .on('change', (path) => {
                logger.info(`File ${path} has been changed`);
                restart();
            })
            .on('unlink', (path) => {
                logger.info(`File ${path} has been removed`);
                restart();
            });
    }
});
