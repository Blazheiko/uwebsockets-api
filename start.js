import 'dotenv/config';
import logger from '#logger';
import * as server from '#start/server.js';
import configApp from '#config/app.js';
import db from '#database/db.js';

logger.info(configApp);
// console.log({ configApp })
db.migrate
    .up({ directory: './database/migrations' })
    .then(() => {
        logger.info('migrate success');
        server.init();
    })
    .catch((e) => {
        /* eslint-disable no-undef */
        console.error(e);
        process.exit(1);
    });
