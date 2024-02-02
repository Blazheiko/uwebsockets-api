import 'dotenv/config';
import logger from '#logger';
import * as server from '#start/server.js';
import configApp from '#config/app.js';

// // Is equivalent to:

logger.info(configApp);
// console.log({ configApp })

server.init();
