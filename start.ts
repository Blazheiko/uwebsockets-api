import process from 'node:process';
// import { isMainThread, parentPort } from 'node:worker_threads';
import 'dotenv/config';
import vine from '@vinejs/vine';
import logger from '#logger';
import { init, stop } from '#vendor/start/server.js';
import configApp from '#config/app.js';
import db from '#database/db.js';
import redis from '#database/redis.js';
import schemas from '#app/validate/schemas/schemas.js';
import validators from '#vendor/start/validators.js';
import { getListRoutes, routesHandler } from '#vendor/start/router.js';
import httpRoutes from '#app/routes/httpRoutes.js';
import wsRoutes from '#app/routes/wsRoutes.js';

// logger.info(configApp);

const migrationDB = async () => {
    await db.migrate.up({ directory: './database/migrations' });
};
const testRedis = async () => {
    await redis.set('test', Date.now().toString());
};

const compileValidateSchema = () => {
    const schemaKeys = Object.keys(schemas);
    schemaKeys.forEach((key: string) => {
        // @ts-ignore
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
        if (configApp.startMigration) {
            await migrationDB();
            logger.info('migrate success');
        }
        await testRedis();
        logger.info('test redis success');
        routesHandler(httpRoutes, false);
        console.log(getListRoutes());
        routesHandler(wsRoutes, true);
        // console.log(getListRoutes());

        init();
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

const stopHandler = (type: string) => {
    stop(type);
    removeListeners();
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
const stopUncaughtException = (err: any, origin: any) => {
    logger.error('event uncaughtException');
    logger.error(err);
    logger.error(origin);
    // console.error(err);
    // console.error(origin);
    stopHandler('uncaughtException');
    process.exit(1);
};

console.log('start');
start().then(() => {
    logger.info('start success');
    // if (!isMainThread && parentPort) {
    //     parentPort.postMessage('start success');
    //     parentPort.on('message', (message) => {
    //         if (message.command === 'shutdown') {
    //             logger.info('message.command === shutdown');
    //             stop('MainThread');
    //             removeListeners();
    //             setTimeout(() => {
    //                 if(parentPort) parentPort.close()
    //                                             // .then(() => {
    //                                             //     logger.info('parentPort.close');
    //                                             //     //process.exit(0);
    //                                             // });
    //             }, 100);
    //         }
    //     });
    // }
});
