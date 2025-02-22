import { Worker, isMainThread } from 'node:worker_threads';
import process from 'node:process';
import logger from '#logger';
import watcher from '#vendor/start/watcher.js';

let worker: Worker | null = null;

//test version

const startDev = () => {
    return new Promise<void>((resolve, reject) => {
        worker = new Worker(`${process.cwd()}/start.ts`);
        worker.on('message', (msg) => {
            logger.info(`Message worker: ${msg}`);
            resolve();
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
            logger.info(`Worker stopped with exit code ${code}`);
            // eslint-disable-next-line no-undef
            setTimeout(() => {
                if (worker) worker.terminate();
                worker = null;
                go();
            }, 100);
        });
    });
};

let isRestart = true;

const restart = () => {
    logger.info('restart dev');
    if (isRestart && worker && worker.postMessage) {
        logger.info('isRestart && worker && worker.postMessage');
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
