import process from "node:process";

import "dotenv/config";
// import vine from '@vinejs/vine';
import logger from "#vendor/utils/logger.js";
import { initServer, stopServer } from "#vendor/start/server.js";
import configApp from "#config/app.js";
// import redis from '#database/redis.js';
// import schemas from '#app/validate/schemas/schemas.js';
// import validators from '#vendor/start/validators.js';
import { routesHandler } from "#vendor/start/router.js";
import httpRoutes from "#app/routes/http-routes.js";
import wsRoutes from "#app/routes/ws-routes.js";
import type { RouteItem } from "#vendor/types/types.js";
import { promptService } from "#app/services/prompt-service.js";
import { startProposalCleanup } from "#app/services/actions/pending-proposals.js";
import '#app/start/index.js';

// logger.info(configApp);

// const testRedis = async (): Promise<void> => {
//     try {
//         await redis.set('test', Date.now().toString());
//     } catch (err) {
//         logger.error({ err }, 'Redis connection failed');
//         throw err;
//     }
// };

// const compileValidateSchema = (): void => {
//     const schemaKeys = Object.keys(schemas);
//     schemaKeys.forEach((key: string) => {
//         validators.set(key, vine.compile(schemas[key].validator));
//     });
// };

const start = async (): Promise<void> => {
  try {
     
    process.title = configApp.appName;
    logger.info(`Starting application on port ${String(configApp.port)}`);
    logger.info(
      "use module: uws_" +
        process.platform +
        "_" +
        process.arch +
        "_" +
        process.versions.modules +
        ".node",
    );
    // compileValidateSchema();
    // await testRedis();
    // logger.info('test redis success');
    await promptService.load();
    startProposalCleanup();
    routesHandler(httpRoutes as unknown as RouteItem[], false);
    // console.log(getListRoutes());
    routesHandler(wsRoutes as unknown as RouteItem[], true);
    // console.log(getWsRoutes());

    await initServer();
    process.on("SIGINT", stopSIGINT);
    process.on("SIGHUP", stopSIGHUP);
    process.on("SIGTERM", stopSIGTERM);
    process.on("uncaughtException", stopUncaughtException);
  } catch (err: unknown) {
    logger.error({ err }, "Failed to start application");
    console.error("Failed to start application:", err);
    process.exit(1);
  }
};

const removeListeners = (): void => {
  process.removeListener("SIGINT", stopSIGINT);
  process.removeListener("SIGHUP", stopSIGHUP);
  process.removeListener("SIGTERM", stopSIGTERM);
  process.removeListener("uncaughtException", stopUncaughtException);
};

const stopHandler = (type: string): void => {
  stopServer(type);
  removeListeners();
};

const stopSIGINT = (): void => {
  logger.info("stop SIGINT");
  stopHandler("SIGINT");
  process.exit(1);
};
const stopSIGHUP = (): void => {
  logger.info("stop SIGHUP");
  stopHandler("SIGHUP");
  process.exit(1);
};
const stopSIGTERM = (): void => {
  logger.info("stop SIGTERM");
  stopHandler("SIGTERM");
  process.exit(1);
};
const stopUncaughtException = (err: unknown, origin: unknown): void => {
  logger.error({ err, origin }, "event uncaughtException");

  stopHandler("uncaughtException");
  process.exit(1);
};

console.log("start");
start()
  .then(() => {
    logger.info("start success");
  })
  .catch((err: unknown) => {
    logger.error({ err: err as Error }, "Unhandled error during startup");
    console.error("Unhandled error during startup:", err);
    process.exit(1);
  });
