import process from 'node:process';
// import { isMainThread, parentPort } from 'node:worker_threads';
import 'dotenv/config';
import vine from '@vinejs/vine';
import logger from '#logger';
import { initServer, stopServer } from '#vendor/start/server.js';
import configApp from '#config/app.js';
import redis from '#database/redis.js';
import schemas from '#app/validate/schemas/schemas.js';
import validators from '#vendor/start/validators.js';
import { getListRoutes, getWsRoutes, routesHandler } from '#vendor/start/router.js';
import httpRoutes from '#app/routes/http-routes.js';
import wsRoutes from '#app/routes/ws-routes.js';
import '#app/start/index.js';

// logger.info(configApp);

const testRedis = async () => {
    await redis.set('test', Date.now().toString());
};

const compileValidateSchema = () => {
    const schemaKeys = Object.keys(schemas);
    schemaKeys.forEach((key: string) => {
        validators.set(key, vine.compile(schemas[key].validator));
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
        await testRedis();
        logger.info('test redis success');
        routesHandler(httpRoutes, false);
        // console.log(getListRoutes());
        routesHandler(wsRoutes, true);
        // console.log(getWsRoutes());

        initServer();
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
    stopServer(type);
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
    logger.error({ err }, 'event uncaughtException');
    // logger.error(err);
    // logger.error(origin);
    // console.error(err);
    // console.error(origin);
    stopHandler('uncaughtException');
    process.exit(1);
};

console.log('start');
start().then(() => {
    logger.info('start success');
});
