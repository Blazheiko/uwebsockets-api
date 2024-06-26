import { Worker, isMainThread } from 'node:worker_threads';
import process from 'node:process';
import logger from '#logger';
import watcher from '#vendor/start/watcher.js';

let worker = null;

const startDev = () => {
    return new Promise((resolve, reject) => {
        worker = new Worker(`${process.cwd()}/start.js`);
        worker.on('message', (msg) => {
            logger.info(`Message worker: ${msg}`);
            resolve();
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
            logger.info(`Worker stopped with exit code ${code}`);
            // eslint-disable-next-line no-undef
            setTimeout(() => {
                worker.terminate();
                worker = null;
                go();
            }, 100);
        });
    });
};
let isRestart = true;
const restart = () => {
    logger.info('restart');
    if (isRestart && worker && worker.postMessage) {
        isRestart = false;
        worker.postMessage({ command: 'shutdown' });
    }
};
let isWatcherStart = false;
const go = () => {
    if (isMainThread)
        startDev()
            .then(() => {
                logger.info('start startDev');
                isRestart = true;
                if (!isWatcherStart) {
                    isWatcherStart = true;
                    watcher(restart);
                }
            })
            .catch(() => {
                logger.error('error go');
            });
};

go();
